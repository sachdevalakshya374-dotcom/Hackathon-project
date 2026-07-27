import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Badge, Bar } from "@/components/UI";
import { Sparkles, Flame, Trophy, Target } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

export default function Progress() {
  const [data, setData] = useState(null);

  useEffect(() => { (async () => { const { data } = await api.get("/progress"); setData(data); })(); }, []);
  if (!data) return <Sparkles className="w-6 h-6 animate-pulse text-indigo-500" />;

  const { profile, badges, radar, modules_done, modules_total } = data;
  const pathPct = Math.round(100 * modules_done / Math.max(1, modules_total));

  return (
    <div className="space-y-8" data-testid="progress-page">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Progress</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl mt-1">Your growth</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="!p-5 bg-amber-500/10 border-amber-500/30">
            <Sparkles className="w-5 h-5 text-amber-500 mb-2" />
            <div className="text-xs uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">XP</div>
            <div className="font-display font-black text-3xl mt-1" data-testid="stat-xp">{profile.xp || 0}</div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="!p-5 bg-rose-500/10 border-rose-500/30">
            <Flame className="w-5 h-5 text-rose-500 mb-2" />
            <div className="text-xs uppercase tracking-[0.2em] text-rose-700 dark:text-rose-400">Streak</div>
            <div className="font-display font-black text-3xl mt-1" data-testid="stat-streak">{profile.streak || 0}</div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="!p-5 bg-sky-500/10 border-sky-500/30">
            <Target className="w-5 h-5 text-sky-500 mb-2" />
            <div className="text-xs uppercase tracking-[0.2em] text-sky-700 dark:text-sky-400">Modules</div>
            <div className="font-display font-black text-3xl mt-1" data-testid="stat-modules">{modules_done}/{modules_total}</div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="!p-5 bg-lime-500/10 border-lime-500/30">
            <Trophy className="w-5 h-5 text-lime-600 mb-2" />
            <div className="text-xs uppercase tracking-[0.2em] text-lime-700 dark:text-lime-400">Badges</div>
            <div className="font-display font-black text-3xl mt-1" data-testid="stat-badges">{badges.length}</div>
          </Card>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Skill radar</div>
          {radar?.length > 2 ? (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radar}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="topic" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--border))" />
                <Radar dataKey="value" stroke="rgb(14,165,233)" fill="rgb(14,165,233)" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-muted-foreground py-10 text-center">Take a few quizzes to fill the radar.</div>
          )}
        </Card>

        <Card>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Mastery by topic</div>
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
      </div>

      <Card>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Path progress</div>
        <Bar value={pathPct} color="sky" />
        <div className="text-sm text-muted-foreground mt-2">{modules_done} of {modules_total} modules complete ({pathPct}%)</div>
      </Card>

      <Card>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Badges earned</div>
        {badges.length ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {badges.map((b) => (
              <div key={b.id} data-testid={`badge-${b.id}`} className="p-4 rounded-2xl bg-secondary border-2 border-border/60 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center mb-2">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div className="font-display font-bold text-sm">{b.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{b.desc}</div>
              </div>
            ))}
          </div>
        ) : <div className="text-sm text-muted-foreground">Complete a lesson to earn your first badge.</div>}
      </Card>
    </div>
  );
}
