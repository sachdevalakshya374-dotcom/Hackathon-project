import React from "react";

export const Btn = ({ children, variant = "primary", className = "", ...props }) => {
  const base = "px-5 py-2.5 rounded-full font-semibold text-sm transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none";
  const styles = {
    primary: "bg-sky-500 text-white hover:bg-sky-600 hover:-translate-y-0.5 active:translate-y-0 tactile",
    ghost: "bg-transparent text-foreground hover:bg-secondary",
    outline: "border-2 border-border bg-transparent text-foreground hover:bg-secondary rounded-xl",
    danger: "bg-rose-500 text-white hover:bg-rose-600 tactile",
    accent: "bg-indigo-500 text-white hover:bg-indigo-600 tactile",
  };
  return <button className={`${base} ${styles[variant]} ${className}`} {...props}>{children}</button>;
};

export const Card = ({ children, className = "", ...props }) => (
  <div className={`bg-card border-2 border-border/60 rounded-2xl p-6 tactile ${className}`} {...props}>
    {children}
  </div>
);

export const Field = ({ label, testid, ...props }) => (
  <label className="block">
    <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
    <input
      data-testid={testid}
      className="mt-2 w-full px-4 py-2.5 rounded-xl border-2 border-border bg-background focus:outline-none focus:ring-2 focus:ring-sky-500"
      {...props}
    />
  </label>
);

export const Bar = ({ value, color = "sky" }) => (
  <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
    <div
      className={`h-full rounded-full bg-${color}-500 transition-all`}
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);

export const Badge = ({ children, tone = "sky" }) => {
  const tones = {
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    lime: "bg-lime-500/10 text-lime-600 dark:text-lime-400",
    amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    slate: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  };
  return <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.15em] font-bold ${tones[tone]}`}>{children}</span>;
};
