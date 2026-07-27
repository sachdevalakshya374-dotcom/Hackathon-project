import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Btn, Card, Field } from "@/components/UI";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success("Welcome back!");
      nav(u.role === "teacher" ? "/teacher" : "/app/path");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Login failed");
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
          <h1 className="font-display text-3xl font-black mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-6">Sign in to continue your journey.</p>
          <form onSubmit={submit} className="space-y-4" data-testid="login-form">
            <Field label="Email" testid="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Field label="Password" testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Btn type="submit" disabled={loading} data-testid="login-submit" className="w-full">
              {loading ? "Signing in…" : "Sign in"}
            </Btn>
          </form>
          <p className="text-sm text-muted-foreground mt-6 text-center">
            New here? <Link to="/signup" className="text-sky-600 dark:text-sky-400 font-semibold" data-testid="link-signup">Create an account</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
