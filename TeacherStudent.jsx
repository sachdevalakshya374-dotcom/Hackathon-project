import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Btn, Card, Badge, Bar } from "@/components/UI";
import { ArrowLeft, Sparkles, StickyNote, SkipForward, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function TeacherStudent() {
  const { sid } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get(`/teacher/student/${sid}`); setData(data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [sid]);

  const addNote = async () => {
    if (!note.trim()) return;
    try {
      await api.post("/teacher/note", { student_id: sid, note });
      setNote(""); toast.success("Note saved"); load();
    } catch { toast.error("Failed"); }
  };

  const override = async (module_id, action) => {
    try { await api.post("/teacher/override", { student_id: sid, module_id, action }); toast.success("Applied"); load(); }
    catch { toast.error("Failed"); }
  };

  if (loading) return <Sparkles className="w-6 h-6 animate-pulse text-indigo-500" />;
  if (!data) return null;
  const { student, profile, path, notes, badges } = data;

  return (
    <div className="space-y-8" data-testid="teacher-student-page">
      <Link to="/teacher" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to students
      </Link>

      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Student</div>
        <h1 className="font-display font-black text-4xl mt-1">{student.name}</h1>
        <p className="text-muted-foreground mt-1">{student.email}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="!p-5"><div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Subject</div><div className="font-display font-black text-xl mt-1">{profile.subject || "—"}</div></Card>
        <Card className="!p-5"><div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">XP</div><div className="font-display font-black text-xl mt-1">{profile.xp || 0}</div></Card>
        <Card className="!p-5"><div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Streak</div><div className="font-display font-black text-xl mt-1">{profile.streak || 0}</div></Card>
        <Card className="!p-5"><div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Badges</div><div className="font-display font-black text-xl mt-1">{badges.length}</div></Card>
      </div>

      <Card>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Mastery</div>
        <div className="space-y-3">
          {Object.entries(profile.mastery || {}).map(([t, v]) => (
            <div key={t}>
              <div className="flex justify-between text-sm mb-1"><span className="font-medium">{t}</span><span className="font-mono text-xs text-muted-foreground">{v}%</span></div>
              <Bar value={v} color={v >= 70 ? "lime" : v >= 40 ? "amber" : "rose"} />
            </div>
          ))}
          {!Object.keys(profile.mastery || {}).length && <div className="text-sm text-muted-foreground">No data yet.</div>}
        </div>
      </Card>

      {path && (
        <Card>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Path modules · Override AI</div>
          <div className="space-y-2">
            {path.modules.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-border" data-testid={`teacher-mod-${i}`}>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{i + 1}. {m.title}</div>
                  <div className="text-xs text-muted-foreground">{m.topic} · {m.difficulty}</div>
                </div>
                <Badge tone={m.status === "completed" ? "lime" : m.status === "unlocked" ? "sky" : "slate"}>{m.status}</Badge>
                <button data-testid={`override-skip-${i}`} onClick={() => override(m.id, "skip")} className="p-2 rounded-lg hover:bg-secondary" title="Mark complete"><SkipForward className="w-4 h-4" /></button>
                <button data-testid={`override-reset-${i}`} onClick={() => override(m.id, "reset")} className="p-2 rounded-lg hover:bg-secondary" title="Reset"><RotateCcw className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Teacher notes</div>
        <div className="flex gap-2 mb-4">
          <input value={note} onChange={(e) => setNote(e.target.value)} data-testid="teacher-note-input"
            placeholder="Add a note for this student…"
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-border bg-background focus:outline-none focus:ring-2 focus:ring-sky-500" />
          <Btn onClick={addNote} data-testid="teacher-note-save"><StickyNote className="w-4 h-4" />Save</Btn>
        </div>
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="p-3 rounded-xl bg-secondary text-sm">
              <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
              <div className="mt-1">{n.note}</div>
            </div>
          ))}
          {!notes.length && <div className="text-sm text-muted-foreground">No notes yet.</div>}
        </div>
      </Card>
    </div>
  );
}
