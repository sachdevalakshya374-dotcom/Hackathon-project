import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Btn, Card, Badge } from "@/components/UI";
import { toast } from "sonner";
import { Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Diagnostic() {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { refresh } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post("/diagnostic/generate");
        setQuiz(data);
      } catch (e) {
        toast.error(e?.response?.data?.detail || "Failed to generate quiz");
      } finally { setLoading(false); }
    })();
  }, []);

  const submit = async () => {
    if (Object.keys(answers).length !== quiz.questions.length) {
      toast.error("Answer every question");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/diagnostic/submit", {
        quiz_id: quiz.quiz_id,
        answers: Object.entries(answers).map(([i, v]) => ({ question_index: Number(i), selected: v })),
      });
      setResult(data);
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Submit failed");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center noise-bg">
    <div className="text-center">
      <Sparkles className="w-10 h-10 text-indigo-500 mx-auto animate-pulse" />
      <div className="mt-3 font-display font-bold">Building your diagnostic…</div>
      <div className="text-sm text-muted-foreground">Claude is thinking of just-right questions.</div>
    </div>
  </div>;

  if (result) return (
    <div className="min-h-screen noise-bg p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <Card>
          <div className="text-center">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Diagnostic complete</div>
            <div className="font-display font-black text-6xl mt-2" data-testid="diag-score">{result.score}%</div>
            <p className="text-muted-foreground mt-2">We built a personalized path from your results.</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-lime-600 mb-2">Strengths</div>
              <div className="flex flex-wrap gap-2">
                {result.strengths.length ? result.strengths.map((s) => <Badge key={s} tone="lime">{s}</Badge>) : <span className="text-sm text-muted-foreground">None yet</span>}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-rose-600 mb-2">Gaps</div>
              <div className="flex flex-wrap gap-2">
                {result.gaps.length ? result.gaps.map((s) => <Badge key={s} tone="rose">{s}</Badge>) : <span className="text-sm text-muted-foreground">Everything looks solid!</span>}
              </div>
            </div>
          </div>
          <Btn data-testid="diag-see-path" className="w-full mt-8" onClick={() => nav("/app/path")}>See your learning path</Btn>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen noise-bg p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Diagnostic</div>
              <h1 className="font-display font-black text-2xl">{quiz.title}</h1>
            </div>
            <Badge tone="indigo">{Object.keys(answers).length} / {quiz.questions.length}</Badge>
          </div>

          <div className="space-y-6" data-testid="diag-quiz">
            {quiz.questions.map((q, qi) => (
              <div key={qi} className="border-t border-border pt-4 first:border-0 first:pt-0">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Q{qi + 1} · {q.topic} · {q.difficulty}</div>
                <div className="font-semibold mb-3">{q.q}</div>
                <div className="grid gap-2">
                  {q.options.map((opt, oi) => (
                    <button key={oi} data-testid={`diag-q${qi}-opt${oi}`}
                      onClick={() => setAnswers({ ...answers, [qi]: oi })}
                      className={`text-left px-4 py-2.5 rounded-xl border-2 transition-all text-sm ${
                        answers[qi] === oi ? "border-sky-500 bg-sky-500/5" : "border-border hover:border-sky-300"
                      }`}>
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{String.fromCharCode(65 + oi)}</span>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Btn onClick={submit} disabled={submitting} data-testid="diag-submit" className="mt-6 w-full">
            {submitting ? "Grading…" : "Submit diagnostic"}
          </Btn>
        </Card>
      </div>
    </div>
  );
}
