import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Btn, Card } from "@/components/UI";
import { GraduationCap, Code2, Sigma } from "lucide-react";
import { toast } from "sonner";

const INTERESTS = ["Web dev", "Data", "Games", "AI/ML", "Puzzles", "Design", "Startups", "Robotics", "Finance"];

export default function Onboarding() {
  const [subject, setSubject] = useState("Programming");
  const [prior, setPrior] = useState("beginner");
  const [goals, setGoals] = useState("");
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const { refresh } = useAuth();
  const nav = useNavigate();

  const toggle = (i) => setInterests((arr) => arr.includes(i) ? arr.filter((x) => x !== i) : [...arr, i]);

  const submit = async () => {
    if (!goals.trim()) { toast.error("Tell us your goal in one line"); return; }
    setLoading(true);
    try {
      await api.post("/onboarding", { subject, goals, interests, prior_knowledge: prior });
      await refresh();
      toast.success("Profile saved!");
      nav("/diagnostic");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen noise-bg p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center tactile">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-black text-2xl">LearnFlow</span>
        </div>
        <Card>
          <h1 className="font-display text-3xl font-black">Let's tune your path</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Just three quick things.</p>

          <div className="space-y-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Pick a subject</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: "Programming", l: "Programming", i: Code2 },
                  { v: "Math", l: "Math", i: Sigma },
                ].map(({ v, l, i: Icon }) => (
                  <button key={v} data-testid={`subject-${v.toLowerCase()}`} onClick={() => setSubject(v)}
                    className={`p-5 rounded-2xl border-2 text-left transition-all ${
                      subject === v ? "border-sky-500 bg-sky-500/5" : "border-border hover:border-sky-300"
                    }`}>
                    <Icon className={`w-5 h-5 mb-2 ${subject === v ? "text-sky-500" : "text-muted-foreground"}`} />
                    <div className="font-bold">{l}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Prior knowledge</div>
              <div className="grid grid-cols-3 gap-3">
                {["beginner", "intermediate", "advanced"].map((p) => (
                  <button key={p} data-testid={`prior-${p}`} onClick={() => setPrior(p)}
                    className={`py-3 rounded-xl border-2 capitalize font-semibold text-sm transition-all ${
                      prior === p ? "border-sky-500 bg-sky-500/5 text-sky-600" : "border-border hover:border-sky-300"
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Your goal</div>
              <textarea data-testid="onb-goals" value={goals} onChange={(e) => setGoals(e.target.value)}
                rows={3} placeholder="e.g. Prepare for internship interviews with strong fundamentals."
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Interests (pick a few)</div>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => (
                  <button key={i} data-testid={`interest-${i}`} onClick={() => toggle(i)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                      interests.includes(i) ? "bg-indigo-500 text-white" : "bg-secondary hover:bg-secondary/80"
                    }`}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Btn onClick={submit} disabled={loading} data-testid="onb-submit" className="mt-8 w-full">
            {loading ? "Saving…" : "Continue to diagnostic"}
          </Btn>
        </Card>
      </div>
    </div>
  );
}
