import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "@/index.css";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppShell from "@/components/AppShell";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Onboarding from "@/pages/Onboarding";
import Diagnostic from "@/pages/Diagnostic";
import Path from "@/pages/Path";
import Lesson from "@/pages/Lesson";
import Progress from "@/pages/Progress";
import Career from "@/pages/Career";
import TeacherDashboard from "@/pages/TeacherDashboard";
import TeacherStudent from "@/pages/TeacherStudent";
import { Sparkles } from "lucide-react";

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center noise-bg"><Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (role && user.role !== role) return <Navigate to={user.role === "teacher" ? "/teacher" : "/app/path"} replace />;
  return children;
}

function StudentGate({ children }) {
  const { user, profile } = useAuth();
  if (user?.role === "student") {
    if (!profile?.onboarded) return <Navigate to="/onboarding" replace />;
    if (!profile?.diagnostic_done) return <Navigate to="/diagnostic" replace />;
  }
  return children;
}
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster richColors position="top-right" />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding" element={<Protected role="student"><Onboarding /></Protected>} />
            <Route path="/diagnostic" element={<Protected role="student"><Diagnostic /></Protected>} />
            <Route path="/app" element={<Protected role="student"><StudentGate><AppShell><Navigate to="/app/path" replace /></AppShell></StudentGate></Protected>} />
            <Route path="/app/path" element={<Protected role="student"><StudentGate><AppShell><Path /></AppShell></StudentGate></Protected>} />
            <Route path="/app/lessons" element={<Protected role="student"><StudentGate><AppShell><Path /></AppShell></StudentGate></Protected>} />
            <Route path="/app/lesson/:moduleId" element={<Protected role="student"><StudentGate><AppShell><Lesson /></AppShell></StudentGate></Protected>} />
            <Route path="/app/progress" element={<Protected role="student"><StudentGate><AppShell><Progress /></AppShell></StudentGate></Protected>} />
            <Route path="/app/career" element={<Protected role="student"><StudentGate><AppShell><Career /></AppShell></StudentGate></Protected>} />
            <Route path="/teacher" element={<Protected role="teacher"><AppShell><TeacherDashboard /></AppShell></Protected>} />
            <Route path="/teacher/student/:sid" element={<Protected role="teacher"><AppShell><TeacherStudent /></AppShell></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

