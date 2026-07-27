import React from "react";
import { Link } from "react-router-dom";
import { Btn } from "@/components/UI";
import { GraduationCap, Sparkles, Flame, Compass, Route, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen noise-bg">
      <header className="max-w-6xl mx-auto flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center tactile">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-black text-xl">LearnFlow</span>
        </div>
        <div className="flex gap-3">
          <Link to="/login"><Btn variant="ghost" data-testid="landing-login">Sign in</Btn></Link>
          <Link to="/signup"><Btn data-testid="landing-signup">Get started</Btn></Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-10 pb-24">
        <div className="max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-[0.2em] mb-6">
            <Sparkles className="w-3 h-3" /> Powered by Claude Sonnet 4.5
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="font-display font-black text-4xl sm:text-6xl tracking-tight leading-[1.05]">
            A tutor that <span className="text-sky-500">learns you</span>,<br/>
            not the other way around.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mt-6 text-lg text-muted-foreground max-w-2xl">
            LearnFlow assesses your strengths, generates a personalized path, adapts every lesson to your pace, and points you toward careers that match your evolving skills.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="mt-8 flex gap-3">
            <Link to="/signup"><Btn data-testid="landing-cta">Start learning free</Btn></Link>
            <Link to="/login"><Btn variant="outline">I'm a teacher</Btn></Link>
          </motion.div>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-6">
          {[
            { icon: Route, tone: "sky", title: "AI-built path", desc: "A diagnostic quiz shapes a bespoke module sequence, re-ordered as you grow." },
            { icon: MessageCircle, tone: "indigo", title: "Socratic tutor", desc: "Chat drawer with lesson context. Encourages thinking over spoon-feeding." },
            { icon: Compass, tone: "amber", title: "Career mapping", desc: "Your mastery signals unlock role suggestions with skill-gap guidance." },
          ].map((c, i) => (
            <motion.div key={c.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
              className="bg-card border-2 border-border/60 rounded-2xl p-6 tactile">
              <div className={`w-10 h-10 rounded-xl bg-${c.tone}-500/15 flex items-center justify-center mb-4`}>
                <c.icon className={`w-5 h-5 text-${c.tone}-500`} />
              </div>
              <div className="font-display font-bold text-lg mb-1">{c.title}</div>
              <p className="text-sm text-muted-foreground">{c.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-3 gap-4 max-w-xl">
          <div className="rounded-2xl p-4 bg-amber-500/10 border-2 border-amber-500/20 text-center">
            <Sparkles className="w-5 h-5 mx-auto text-amber-500 mb-1" />
            <div className="text-2xl font-display font-black">XP</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Every quiz</div>
          </div>
          <div className="rounded-2xl p-4 bg-rose-500/10 border-2 border-rose-500/20 text-center">
            <Flame className="w-5 h-5 mx-auto text-rose-500 mb-1" />
            <div className="text-2xl font-display font-black">Streaks</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Show up daily</div>
          </div>
          <div className="rounded-2xl p-4 bg-lime-500/10 border-2 border-lime-500/20 text-center">
            <GraduationCap className="w-5 h-5 mx-auto text-lime-600 mb-1" />
            <div className="text-2xl font-display font-black">Badges</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Earn as you go</div>
          </div>
        </div>
      </section>
    </div>
  );
}
