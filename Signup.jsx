import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Btn, Card, Field } from "@/components/UI";
import { GraduationCap, User, Users } from "lucide-react";
import { toast } from "sonner";

export default function Signup() {
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "student" });
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await signup(form);
      toast.success("Account created!");
      nav(u.role === "teacher" ? "/teacher" : "/onboarding");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Signup failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen noise-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center tactile">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-black text-2xl">LearnFlow</span>
        </Link>
        <Card>
          <h1 className="font-display text-3xl font-black mb-1">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-6">Pick your role and get started in seconds.</p>
          <form onSubmit={submit} className="space-y-4" data-testid="signup-form">
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: "student", l: "Student", i: User },
                { v: "teacher", l: "Teacher", i: Users },
              ].map(({ v, l, i: Icon }) => (
                <button
                  type="button"
                  key={v}
                  data-testid={`role-${v}`}
                  onClick={() => setForm({ ...form, role: v })}
                  className={`p-4 rounded-2xl border-2 transition-all text-left ${
                    form.role === v ? "border-sky-500 bg-sky-500/5" : "border-border hover:border-sky-300"
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${form.role === v ? "text-sky-500" : "text-muted-foreground"}`} />
                  <div className="font-bold text-sm">{l}</div>
                </button>
              ))}
            </div>
            <Field label="Name" testid="signup-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Field label="Email" testid="signup-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Field label="Password" testid="signup-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            <Btn type="submit" disabled={loading} data-testid="signup-submit" className="w-full">
              {loading ? "Creating…" : "Create account"}
            </Btn>
          </form>
          <p className="text-sm text-muted-foreground mt-6 text-center">
            Already have an account? <Link to="/login" className="text-sky-600 dark:text-sky-400 font-semibold" data-testid="link-login">Sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
