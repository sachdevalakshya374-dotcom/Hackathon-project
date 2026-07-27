import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Btn, Card, Badge, Bar } from "@/components/UI";
import { Lock, PlayCircle, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Path() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegen] = useState(false);
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/path");
      setData(data);
      if (!data.path) nav("/diagnostic");
    } catch (e) {
      toast.error("Failed to load path");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const regen = async () => {
    setRegen(true);
    try {
      await api.post("/path/regenerate");
      await load();
      toast.success("New path ready");
    } catch (e) { toast.error("Failed"); } finally { setRegen(false); }
  };

  if (loading) return <div className="p-8"><Sparkles className="w-6 h-6 animate-pulse text-indigo-500" /></div>;
  if (!data?.path) return null;
  const { path, profile } = data;
  const done = profile.completed_modules?.length || 0;
  const pct = Math.round(100 * done / Math.max(1, path.modules.length));

  return (
    <div className="space-y-8" data-testid="path-page">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your Path · {path.subject}</div>
          <h1 className="font-display font-black text-4xl sm:text-5xl mt-1">{path.title}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">{path.summary}</p>
        </div>
        <Btn variant="outline" onClick={regen} disabled={regenerating} data-testid="path-regen">
          <RotateCcw className="w-4 h-4" /> {regenerating ? "Regenerating…" : "Regenerate"}
        </Btn>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Overall progress</div>
          <div className="text-sm font-bold" data-testid="path-progress-pct">{done}/{path.modules.length} · {pct}%</div>
        </div>
        <Bar value={pct} color="sky" />
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {path.modules.map((m, i) => {
          const locked = m.status === "locked";
          const doneM = m.status === "completed";
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className={`bg-card border-2 rounded-2xl p-5 tactile transition-all ${
                locked ? "border-border opacity-70" : "border-border/60 hover:border-sky-500"
              }`} data-testid={`module-${i}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Module {i + 1} · {m.topic}</div>
                  <Badge tone={m.difficulty === "easy" ? "lime" : m.difficulty === "medium" ? "amber" : "rose"}>{m.difficulty}</Badge>
                </div>
                <h3 className="font-display font-bold text-lg">{m.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{m.objective}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">~{m.est_minutes || 15} min</span>
                  {locked ? (
                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm"><Lock className="w-4 h-4" />Locked</div>
                  ) : doneM ? (
                    <Link to={`/app/lesson/${m.id}`}><Btn variant="ghost" data-testid={`module-review-${i}`}><CheckCircle2 className="w-4 h-4 text-lime-500" />Review</Btn></Link>
                  ) : (
                    <Link to={`/app/lesson/${m.id}`}><Btn data-testid={`module-start-${i}`}><PlayCircle className="w-4 h-4" />Start</Btn></Link>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
