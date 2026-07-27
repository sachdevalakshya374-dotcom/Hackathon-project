import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Route, BookOpen, MessageCircle, LineChart, Compass, LogOut, Moon, Sun, GraduationCap, Users, Flame, Sparkles } from "lucide-react";
import TutorDrawer from "@/components/TutorDrawer";

const studentNav = [
  { to: "/app/path", label: "Path", icon: Route },
  { to: "/app/lessons", label: "Lessons", icon: BookOpen },
  { to: "/app/progress", label: "Progress", icon: LineChart },
  { to: "/app/career", label: "Career", icon: Compass },
];
const teacherNav = [
  { to: "/teacher", label: "Students", icon: Users },
];

export default function AppShell({ children }) {
  const { user, profile, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [tutorOpen, setTutorOpen] = useState(false);
  const nav = user?.role === "teacher" ? teacherNav : studentNav;

  return (
    <div className="min-h-screen noise-bg" data-testid="app-shell">
      <aside className="fixed inset-y-0 left-0 w-[240px] border-r border-border bg-card p-6 z-40 hidden md:flex flex-col gap-8">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center tactile">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-display font-black text-lg leading-none">LearnFlow</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AI Tutor</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1" data-testid="side-nav">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={`nav-${label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? "bg-sky-500 text-white tactile" : "hover:bg-secondary text-foreground/80"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
          {user?.role === "student" && (
            <button
              onClick={() => setTutorOpen(true)}
              data-testid="nav-tutor"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-secondary text-foreground/80 text-left"
            >
              <MessageCircle className="w-4 h-4" />
              AI Tutor
              <Sparkles className="w-3 h-3 ml-auto text-indigo-500" />
            </button>
          )}
        </nav>

        {user?.role === "student" && profile && (
          <div className="mt-auto rounded-2xl border border-border p-4 bg-secondary/40" data-testid="side-stats">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Today</div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                <Sparkles className="w-4 h-4" />
                <span data-testid="side-xp">{profile.xp || 0} XP</span>
              </div>
              <div className="flex items-center gap-1 text-rose-500 font-bold">
                <Flame className="w-4 h-4" />
                <span data-testid="side-streak">{profile.streak || 0}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button onClick={toggle} data-testid="theme-toggle" className="p-2 rounded-lg hover:bg-secondary">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <span className="truncate max-w-[120px]" title={user?.email}>{user?.name}</span>
          <button onClick={() => { logout(); navigate("/login"); }} data-testid="logout-btn" className="p-2 rounded-lg hover:bg-secondary">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <main className="md:ml-[240px] p-6 lg:p-10 max-w-6xl">
        {children}
      </main>

      {user?.role === "student" && (
        <TutorDrawer open={tutorOpen} onClose={() => setTutorOpen(false)} />
      )}
    </div>
  );
}
