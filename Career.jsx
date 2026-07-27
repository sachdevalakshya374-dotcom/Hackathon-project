import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Btn, Card, Badge, Bar } from "@/components/UI";
import { Sparkles, Briefcase, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Career() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/career");
      setData(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-center py-16">
    <Sparkles className="w-8 h-8 text-indigo-500 mx-auto animate-pulse" />
    <div className="mt-3 font-display font-bold">Mapping careers to your skills…</div>
  </div>;

  return (
    <div className="space-y-8" data-testid="career-page">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Career Compass</div>
          <h1 className="font-display font-black text-4xl sm:text-5xl mt-1">Where can you go?</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">Roles matched to your current skill signals. Regenerate as your mastery grows.</p>
        </div>
        <Btn variant="outline" onClick={load} data-testid="career-refresh">Refresh</Btn>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {(data?.careers || []).map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card data-testid={`career-${i}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Fit</div>
                  <div className="font-display font-black text-2xl text-sky-500">{c.fit_score}%</div>
                </div>
              </div>
              <h3 className="font-display font-bold text-xl mt-2">{c.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{c.why}</p>
              <Bar value={c.fit_score} color="sky" />
              <div className="mt-4 space-y-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-600 mb-2">Matching skills</div>
                  <div className="flex flex-wrap gap-2">
                    {(c.matching_skills || []).map((s) => <Badge key={s} tone="lime">{s}</Badge>)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 mb-2">Skills to build</div>
                  <div className="flex flex-wrap gap-2">
                    {(c.skills_to_build || []).map((s) => <Badge key={s} tone="amber">{s}</Badge>)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Next steps</div>
                  <ul className="space-y-1.5">
                    {(c.next_steps || []).map((s, j) => (
                      <li key={j} className="text-sm flex gap-2"><ArrowRight className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
