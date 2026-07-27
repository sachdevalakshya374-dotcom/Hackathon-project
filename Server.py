from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Literal
from pathlib import Path
from datetime import datetime, timezone, timedelta
import os, json, uuid, logging, re, asyncio
import bcrypt, jwt

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = os.environ.get('JWT_ALG', 'HS256')
JWT_EXP_HOURS = int(os.environ.get('JWT_EXP_HOURS', '168'))
CLAUDE_MODEL = "claude-sonnet-4-5-20250929"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="LearnFlow AI")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("learnflow")


# ========== MODELS ==========
Role = Literal["student", "teacher"]


class SignupIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Role


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class OnboardingIn(BaseModel):
    subject: str
    goals: str
    interests: List[str] = []
    prior_knowledge: Literal["beginner", "intermediate", "advanced"] = "beginner"


class QuizAnswerIn(BaseModel):
    question_index: int
    selected: int  # index into options


class DiagnosticSubmitIn(BaseModel):
    quiz_id: str
    answers: List[QuizAnswerIn]


class LessonQuizSubmitIn(BaseModel):
    lesson_id: str
    answers: List[QuizAnswerIn]


class TutorMessageIn(BaseModel):
    message: str
    lesson_id: Optional[str] = None
    session_id: Optional[str] = None


class TeacherNoteIn(BaseModel):
    student_id: str
    note: str


class OverrideModuleIn(BaseModel):
    student_id: str
    module_id: str
    action: Literal["skip", "reorder", "reset"]
    new_index: Optional[int] = None


# ========== AUTH HELPERS ==========
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def check_pw(pw: str, h: str) -> bool:
    return bcrypt.checkpw(pw.encode(), h.encode())


def make_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing auth")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


def require_role(role: Role):
    async def _guard(user=Depends(get_current_user)):
        if user["role"] != role:
            raise HTTPException(403, f"Requires {role} role")
        return user
    return _guard


# ========== AI HELPERS ==========
def _new_chat(session_id: str, system_message: str) -> LlmChat:
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model("anthropic", CLAUDE_MODEL)


async def _ai_json(system: str, prompt: str, session_id: Optional[str] = None) -> Any:
    chat = _new_chat(session_id or str(uuid.uuid4()), system)
    parts: List[str] = []
    async for ev in chat.stream_message(UserMessage(text=prompt)):
        if isinstance(ev, TextDelta):
            parts.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    text = "".join(parts).strip()
    # extract JSON block
    m = re.search(r"\{[\s\S]*\}|\[[\s\S]*\]", text)
    raw = m.group(0) if m else text
    try:
        return json.loads(raw)
    except Exception as e:
        logger.error(f"JSON parse failed: {e}\nRaw: {text[:500]}")
        raise HTTPException(500, "AI returned invalid JSON")


# ========== AI PROMPTS ==========
QUIZ_SYS = "You are an expert educational assessment designer. You return ONLY valid JSON, no prose, no markdown code fences."


async def generate_diagnostic_quiz(subject: str, prior: str) -> Dict[str, Any]:
    prompt = (
        f"Create a 6-question diagnostic quiz for the subject: {subject}. "
        f"Learner's self-reported level: {prior}. "
        "Cover a spread of subtopics (at least 4 distinct subtopics) and a spread of difficulties (easy, medium, hard). "
        "Return JSON with schema: {\"title\": str, \"subject\": str, \"questions\": [{\"q\": str, \"options\": [str,str,str,str], \"correct\": int (0-3), \"topic\": str, \"difficulty\": \"easy|medium|hard\", \"explanation\": str}] }"
    )
    data = await _ai_json(QUIZ_SYS, prompt)
    return data


async def generate_learning_path(profile: Dict[str, Any]) -> Dict[str, Any]:
    system = "You design personalized learning paths. Return ONLY valid JSON."
    prompt = (
        "Build a personalized learning path.\n"
        f"Subject: {profile.get('subject')}\n"
        f"Goals: {profile.get('goals')}\n"
        f"Interests: {profile.get('interests')}\n"
        f"Prior level: {profile.get('prior_knowledge')}\n"
        f"Strengths: {profile.get('strengths', [])}\n"
        f"Gaps: {profile.get('gaps', [])}\n"
        f"Overall diagnostic score: {profile.get('diagnostic_score', 'n/a')}\n"
        "Return JSON: {\"title\": str, \"summary\": str, \"modules\": [{\"title\": str, \"topic\": str, \"objective\": str, \"difficulty\": \"easy|medium|hard\", \"est_minutes\": int}] } "
        "Provide 6-8 modules ordered from foundational to advanced, prioritizing gap topics early."
    )
    return await _ai_json(system, prompt)


async def generate_lesson_content(module: Dict[str, Any], subject: str) -> Dict[str, Any]:
    system = "You are a friendly, clear educator. Return ONLY valid JSON."
    prompt = (
        f"Write a lesson for a {subject} learner.\n"
        f"Module: {module.get('title')} — {module.get('objective')}. Topic: {module.get('topic')}. Difficulty: {module.get('difficulty')}.\n"
        "Return JSON: {\"intro\": str, \"sections\": [{\"heading\": str, \"body\": str, \"example\": str}], \"key_takeaways\": [str], "
        "\"quiz\": [{\"q\": str, \"options\": [str,str,str,str], \"correct\": int, \"explanation\": str, \"difficulty\": \"easy|medium|hard\"}] } "
        "Include 3-4 sections, 3-4 takeaways, and 4 adaptive quiz questions of varying difficulty. Use plain markdown-safe text (no code fences)."
    )
    return await _ai_json(system, prompt)


async def generate_career_recommendations(profile: Dict[str, Any]) -> Dict[str, Any]:
    system = "You are a career counselor for learners. Return ONLY valid JSON."
    prompt = (
        f"Given this learner profile, suggest 4 fitting careers.\n"
        f"Subject focus: {profile.get('subject')}\n"
        f"Interests: {profile.get('interests')}\n"
        f"Goals: {profile.get('goals')}\n"
        f"Strengths (topics with high mastery): {profile.get('strengths')}\n"
        f"Gaps (topics with low mastery): {profile.get('gaps')}\n"
        "Return JSON: {\"careers\": [{\"title\": str, \"fit_score\": int (0-100), \"why\": str, \"matching_skills\": [str], \"skills_to_build\": [str], \"next_steps\": [str]}]}"
    )
    return await _ai_json(system, prompt)


# ========== BADGE / GAMIFICATION ==========
def compute_badges(profile: Dict[str, Any]) -> List[Dict[str, str]]:
    badges = []
    xp = profile.get("xp", 0)
    streak = profile.get("streak", 0)
    lessons_done = len(profile.get("completed_modules", []))
    if xp >= 50: badges.append({"id": "spark", "name": "Spark Starter", "desc": "Earned 50 XP"})
    if xp >= 200: badges.append({"id": "grinder", "name": "Grinder", "desc": "Earned 200 XP"})
    if xp >= 500: badges.append({"id": "sage", "name": "Sage", "desc": "Earned 500 XP"})
    if streak >= 3: badges.append({"id": "streak3", "name": "3-Day Streak", "desc": "Kept a 3-day streak"})
    if streak >= 7: badges.append({"id": "streak7", "name": "Week Warrior", "desc": "Kept a 7-day streak"})
    if lessons_done >= 1: badges.append({"id": "firststep", "name": "First Step", "desc": "Completed a lesson"})
    if lessons_done >= 5: badges.append({"id": "explorer", "name": "Explorer", "desc": "Completed 5 lessons"})
    return badges


def update_streak(profile: Dict[str, Any]) -> Dict[str, Any]:
    today = datetime.now(timezone.utc).date().isoformat()
    last = profile.get("last_active_date")
    streak = profile.get("streak", 0)
    if last == today:
        pass
    elif last:
        last_d = datetime.fromisoformat(last).date()
        diff = (datetime.now(timezone.utc).date() - last_d).days
        streak = streak + 1 if diff == 1 else 1
    else:
        streak = 1
    profile["streak"] = streak
    profile["last_active_date"] = today
    return profile


async def get_or_create_profile(user_id: str) -> Dict[str, Any]:
    prof = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not prof:
        prof = {
            "user_id": user_id,
            "subject": None,
            "goals": "",
            "interests": [],
            "prior_knowledge": "beginner",
            "onboarded": False,
            "diagnostic_done": False,
            "diagnostic_score": None,
            "strengths": [],
            "gaps": [],
            "mastery": {},   # topic -> 0..100
            "xp": 0,
            "streak": 0,
            "last_active_date": None,
            "completed_modules": [],
            "path_id": None,
        }
        await db.profiles.insert_one(dict(prof))
    return prof


async def save_profile(prof: Dict[str, Any]):
    await db.profiles.update_one({"user_id": prof["user_id"]}, {"$set": {k: v for k, v in prof.items() if k != "_id"}}, upsert=True)


# ========== AUTH ROUTES ==========
@api.post("/auth/signup")
async def signup(body: SignupIn):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": body.email.lower(),
        "name": body.name,
        "role": body.role,
        "password": hash_pw(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    await get_or_create_profile(user_id)
    token = make_token(user_id, body.role)
    return {"token": token, "user": {"id": user_id, "email": user["email"], "name": user["name"], "role": user["role"]}}


@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not check_pw(body.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")
    token = make_token(user["id"], user["role"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    prof = await get_or_create_profile(user["id"]) if user["role"] == "student" else None
    return {"user": user, "profile": prof}


# ========== ONBOARDING ==========
@api.post("/onboarding")
async def onboard(body: OnboardingIn, user=Depends(require_role("student"))):
    prof = await get_or_create_profile(user["id"])
    prof.update({
        "subject": body.subject, "goals": body.goals,
        "interests": body.interests, "prior_knowledge": body.prior_knowledge,
        "onboarded": True,
    })
    prof = update_streak(prof)
    await save_profile(prof)
    return prof


# ========== DIAGNOSTIC ==========
@api.post("/diagnostic/generate")
async def diag_gen(user=Depends(require_role("student"))):
    prof = await get_or_create_profile(user["id"])
    if not prof.get("onboarded"):
        raise HTTPException(400, "Complete onboarding first")
    data = await generate_diagnostic_quiz(prof["subject"], prof["prior_knowledge"])
    quiz_id = str(uuid.uuid4())
    quiz_doc = {
        "id": quiz_id, "user_id": user["id"], "kind": "diagnostic",
        "subject": prof["subject"], "questions": data["questions"],
        "title": data.get("title", "Diagnostic Quiz"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.quizzes.insert_one(dict(quiz_doc))
    # return without correct answers
    safe_qs = [{"q": q["q"], "options": q["options"], "topic": q.get("topic", ""), "difficulty": q.get("difficulty", "medium")} for q in data["questions"]]
    return {"quiz_id": quiz_id, "title": quiz_doc["title"], "questions": safe_qs}


@api.post("/diagnostic/submit")
async def diag_submit(body: DiagnosticSubmitIn, user=Depends(require_role("student"))):
    quiz = await db.quizzes.find_one({"id": body.quiz_id, "user_id": user["id"]}, {"_id": 0})
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    qs = quiz["questions"]
    per_topic: Dict[str, Dict[str, int]] = {}
    correct_count = 0
    detailed = []
    for a in body.answers:
        q = qs[a.question_index]
        topic = q.get("topic", "general")
        per_topic.setdefault(topic, {"c": 0, "t": 0})
        per_topic[topic]["t"] += 1
        is_correct = a.selected == q["correct"]
        if is_correct:
            correct_count += 1
            per_topic[topic]["c"] += 1
        detailed.append({"q": q["q"], "correct": q["correct"], "selected": a.selected, "explanation": q.get("explanation", ""), "is_correct": is_correct})
    score = round(100 * correct_count / max(1, len(qs)))
    strengths, gaps, mastery = [], [], {}
    for t, v in per_topic.items():
        m = round(100 * v["c"] / v["t"])
        mastery[t] = m
        (strengths if m >= 67 else gaps).append(t)

    prof = await get_or_create_profile(user["id"])
    prof.update({"diagnostic_done": True, "diagnostic_score": score, "strengths": strengths, "gaps": gaps, "mastery": mastery})
    prof["xp"] = prof.get("xp", 0) + 30
    prof = update_streak(prof)

    # generate learning path
    path_data = await generate_learning_path(prof)
    path_id = str(uuid.uuid4())
    modules = [
        {**m, "id": str(uuid.uuid4()), "status": "locked" if i > 0 else "unlocked", "order": i}
        for i, m in enumerate(path_data.get("modules", []))
    ]
    path_doc = {
        "id": path_id, "user_id": user["id"], "title": path_data.get("title", "Your Path"),
        "summary": path_data.get("summary", ""), "modules": modules, "subject": prof["subject"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.paths.insert_one(dict(path_doc))
    prof["path_id"] = path_id
    await save_profile(prof)

    return {"score": score, "mastery": mastery, "strengths": strengths, "gaps": gaps, "path_id": path_id, "detailed": detailed}


# ========== PATH ==========
@api.get("/path")
async def get_path(user=Depends(require_role("student"))):
    prof = await get_or_create_profile(user["id"])
    if not prof.get("path_id"):
        return {"path": None}
    path = await db.paths.find_one({"id": prof["path_id"]}, {"_id": 0})
    return {"path": path, "profile": prof}


@api.post("/path/regenerate")
async def regen_path(user=Depends(require_role("student"))):
    prof = await get_or_create_profile(user["id"])
    if not prof.get("diagnostic_done"):
        raise HTTPException(400, "Take the diagnostic first")
    path_data = await generate_learning_path(prof)
    path_id = str(uuid.uuid4())
    modules = [
        {**m, "id": str(uuid.uuid4()), "status": "locked" if i > 0 else "unlocked", "order": i}
        for i, m in enumerate(path_data.get("modules", []))
    ]
    path_doc = {
        "id": path_id, "user_id": user["id"], "title": path_data.get("title", "Your Path"),
        "summary": path_data.get("summary", ""), "modules": modules, "subject": prof["subject"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.paths.insert_one(dict(path_doc))
    prof["path_id"] = path_id
    await save_profile(prof)
    return {"path": path_doc}


# ========== LESSON ==========
@api.get("/lesson/{module_id}")
async def get_lesson(module_id: str, user=Depends(require_role("student"))):
    prof = await get_or_create_profile(user["id"])
    path = await db.paths.find_one({"id": prof["path_id"]}, {"_id": 0}) if prof.get("path_id") else None
    if not path:
        raise HTTPException(404, "No path")
    module = next((m for m in path["modules"] if m["id"] == module_id), None)
    if not module:
        raise HTTPException(404, "Module not found")
    # check existing lesson
    existing = await db.lessons.find_one({"module_id": module_id, "user_id": user["id"]}, {"_id": 0})
    if existing:
        # difficulty may have adapted; return latest
        return {"lesson": existing, "module": module}
    # Adaptive difficulty: bump up if mastery already high for topic
    topic = module.get("topic", "")
    m_score = prof.get("mastery", {}).get(topic, 50)
    if m_score >= 75 and module.get("difficulty") == "easy": module["difficulty"] = "medium"
    if m_score >= 85 and module.get("difficulty") == "medium": module["difficulty"] = "hard"
    content = await generate_lesson_content(module, prof["subject"])
    lesson_id = str(uuid.uuid4())
    lesson_doc = {
        "id": lesson_id, "user_id": user["id"], "module_id": module_id,
        "subject": prof["subject"], "content": content, "difficulty": module.get("difficulty", "medium"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.lessons.insert_one(dict(lesson_doc))
    return {"lesson": lesson_doc, "module": module}


@api.post("/lesson/quiz/submit")
async def lesson_quiz_submit(body: LessonQuizSubmitIn, user=Depends(require_role("student"))):
    lesson = await db.lessons.find_one({"id": body.lesson_id, "user_id": user["id"]}, {"_id": 0})
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    qs = lesson["content"].get("quiz", [])
    correct = 0
    per_diff = {"easy": {"c": 0, "t": 0}, "medium": {"c": 0, "t": 0}, "hard": {"c": 0, "t": 0}}
    detailed = []
    for a in body.answers:
        if a.question_index >= len(qs): continue
        q = qs[a.question_index]
        d = q.get("difficulty", "medium")
        per_diff.setdefault(d, {"c": 0, "t": 0})
        per_diff[d]["t"] += 1
        ok = a.selected == q["correct"]
        if ok:
            correct += 1
            per_diff[d]["c"] += 1
        detailed.append({"q": q["q"], "correct": q["correct"], "selected": a.selected, "explanation": q.get("explanation", ""), "is_correct": ok})
    score = round(100 * correct / max(1, len(qs)))
    passed = score >= 60

    # update profile
    prof = await get_or_create_profile(user["id"])
    path = await db.paths.find_one({"id": prof["path_id"]}, {"_id": 0}) if prof.get("path_id") else None
    module = next((m for m in (path["modules"] if path else []) if m["id"] == lesson["module_id"]), None)
    topic = module.get("topic", "general") if module else "general"
    prev = prof.get("mastery", {}).get(topic, 50)
    new_mastery = round(0.5 * prev + 0.5 * score)
    prof.setdefault("mastery", {})[topic] = new_mastery
    # adaptive next difficulty for this module: adjust in-place in path
    if path and module:
        if score >= 80 and module.get("difficulty") == "easy": module["difficulty"] = "medium"
        elif score >= 80 and module.get("difficulty") == "medium": module["difficulty"] = "hard"
        elif score < 50 and module.get("difficulty") == "hard": module["difficulty"] = "medium"
        elif score < 50 and module.get("difficulty") == "medium": module["difficulty"] = "easy"
        if passed:
            if lesson["module_id"] not in prof.get("completed_modules", []):
                prof.setdefault("completed_modules", []).append(lesson["module_id"])
            # unlock next
            for m in path["modules"]:
                if m["id"] == lesson["module_id"]:
                    m["status"] = "completed"
                idx = m.get("order", 0)
            # unlock next locked module
            for m in path["modules"]:
                if m["status"] == "locked" and any(mm["id"] == lesson["module_id"] and mm.get("order", 0) + 1 == m.get("order", 0) for mm in path["modules"]):
                    m["status"] = "unlocked"
                    break
            await db.paths.update_one({"id": path["id"]}, {"$set": {"modules": path["modules"]}})
        # rebuild strengths/gaps from mastery
        prof["strengths"] = [t for t, m in prof["mastery"].items() if m >= 70]
        prof["gaps"] = [t for t, m in prof["mastery"].items() if m < 50]
    prof["xp"] = prof.get("xp", 0) + (20 if passed else 5)
    prof = update_streak(prof)
    await save_profile(prof)

    return {"score": score, "passed": passed, "detailed": detailed, "mastery": prof["mastery"], "xp": prof["xp"], "streak": prof["streak"]}


# ========== TUTOR CHAT (STREAMING SSE) ==========
@api.post("/tutor/stream")
async def tutor_stream(body: TutorMessageIn, user=Depends(require_role("student"))):
    prof = await get_or_create_profile(user["id"])
    session_id = body.session_id or f"tutor-{user['id']}"
    context_bits = [f"Learner is studying {prof.get('subject')}. Level: {prof.get('prior_knowledge')}."]
    if body.lesson_id:
        lesson = await db.lessons.find_one({"id": body.lesson_id, "user_id": user["id"]}, {"_id": 0})
        if lesson:
            content = lesson["content"]
            ctx = content.get("intro", "") + "\n" + "\n".join(s.get("heading", "") + ": " + s.get("body", "") for s in content.get("sections", [])[:2])
            context_bits.append(f"Current lesson context (excerpt):\n{ctx[:1200]}")
    system = ("You are LearnFlow AI Tutor: warm, concise, Socratic. Encourage learners to think. "
              "Use short paragraphs. Never reveal quiz answers verbatim unless the learner explicitly asks after multiple attempts. "
              + " ".join(context_bits))

    # store user message
    msg_id = str(uuid.uuid4())
    await db.chats.insert_one({
        "id": msg_id, "user_id": user["id"], "session_id": session_id, "role": "user",
        "content": body.message, "lesson_id": body.lesson_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    async def gen():
        chat = _new_chat(session_id, system)
        parts: List[str] = []
        try:
            async for ev in chat.stream_message(UserMessage(text=body.message)):
                if isinstance(ev, TextDelta):
                    parts.append(ev.content)
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
            full = "".join(parts)
            await db.chats.insert_one({
                "id": str(uuid.uuid4()), "user_id": user["id"], "session_id": session_id, "role": "assistant",
                "content": full, "lesson_id": body.lesson_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            logger.error(f"tutor stream error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api.get("/tutor/history")
async def tutor_history(session_id: str, user=Depends(require_role("student"))):
    msgs = await db.chats.find({"user_id": user["id"], "session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"messages": msgs}


# ========== PROGRESS ==========
@api.get("/progress")
async def progress(user=Depends(require_role("student"))):
    prof = await get_or_create_profile(user["id"])
    path = await db.paths.find_one({"id": prof["path_id"]}, {"_id": 0}) if prof.get("path_id") else None
    total = len(path["modules"]) if path else 0
    done = len(prof.get("completed_modules", []))
    badges = compute_badges(prof)
    mastery = prof.get("mastery", {})
    radar = [{"topic": t[:16], "value": v} for t, v in mastery.items()]
    return {
        "profile": prof, "badges": badges,
        "modules_total": total, "modules_done": done,
        "radar": radar, "path": path,
    }


# ========== CAREER ==========
@api.get("/career")
async def career(user=Depends(require_role("student"))):
    prof = await get_or_create_profile(user["id"])
    if not prof.get("diagnostic_done"):
        raise HTTPException(400, "Take the diagnostic first")
    # cache-ish: regenerate on demand
    data = await generate_career_recommendations(prof)
    await db.careers.update_one({"user_id": user["id"]}, {"$set": {"user_id": user["id"], "data": data, "updated_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    return data


# ========== TEACHER ==========
@api.get("/teacher/students")
async def teacher_students(user=Depends(require_role("teacher"))):
    students = await db.users.find({"role": "student"}, {"_id": 0, "password": 0}).to_list(200)
    profiles = {p["user_id"]: p for p in await db.profiles.find({}, {"_id": 0}).to_list(500)}
    result = []
    for s in students:
        p = profiles.get(s["id"], {})
        result.append({
            "id": s["id"], "name": s["name"], "email": s["email"],
            "subject": p.get("subject"), "xp": p.get("xp", 0), "streak": p.get("streak", 0),
            "modules_done": len(p.get("completed_modules", [])),
            "diagnostic_score": p.get("diagnostic_score"),
        })
    return {"students": result}


@api.get("/teacher/student/{sid}")
async def teacher_student_detail(sid: str, user=Depends(require_role("teacher"))):
    student = await db.users.find_one({"id": sid, "role": "student"}, {"_id": 0, "password": 0})
    if not student:
        raise HTTPException(404, "Student not found")
    prof = await db.profiles.find_one({"user_id": sid}, {"_id": 0}) or {}
    path = await db.paths.find_one({"id": prof.get("path_id")}, {"_id": 0}) if prof.get("path_id") else None
    notes = await db.notes.find({"student_id": sid, "teacher_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    badges = compute_badges(prof) if prof else []
    return {"student": student, "profile": prof, "path": path, "notes": notes, "badges": badges}


@api.post("/teacher/note")
async def teacher_note(body: TeacherNoteIn, user=Depends(require_role("teacher"))):
    note = {
        "id": str(uuid.uuid4()), "teacher_id": user["id"], "student_id": body.student_id,
        "note": body.note, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notes.insert_one(dict(note))
    return {"note": note}


@api.post("/teacher/override")
async def teacher_override(body: OverrideModuleIn, user=Depends(require_role("teacher"))):
    prof = await db.profiles.find_one({"user_id": body.student_id}, {"_id": 0})
    if not prof or not prof.get("path_id"):
        raise HTTPException(404, "Student path missing")
    path = await db.paths.find_one({"id": prof["path_id"]}, {"_id": 0})
    mods = path["modules"]
    idx = next((i for i, m in enumerate(mods) if m["id"] == body.module_id), None)
    if idx is None:
        raise HTTPException(404, "Module not found")
    if body.action == "skip":
        mods[idx]["status"] = "completed"
        if body.module_id not in prof.get("completed_modules", []):
            prof.setdefault("completed_modules", []).append(body.module_id)
        # unlock next
        if idx + 1 < len(mods) and mods[idx + 1]["status"] == "locked":
            mods[idx + 1]["status"] = "unlocked"
    elif body.action == "reset":
        mods[idx]["status"] = "unlocked"
        if body.module_id in prof.get("completed_modules", []):
            prof["completed_modules"].remove(body.module_id)
    elif body.action == "reorder" and body.new_index is not None:
        m = mods.pop(idx)
        mods.insert(min(body.new_index, len(mods)), m)
        for i, mm in enumerate(mods): mm["order"] = i
    await db.paths.update_one({"id": path["id"]}, {"$set": {"modules": mods}})
    await save_profile(prof)
    return {"ok": True, "path_id": path["id"]}


# ========== ROOT ==========
@api.get("/")
async def root():
    return {"app": "LearnFlow AI", "ok": True}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def _shutdown():
    client.close()
