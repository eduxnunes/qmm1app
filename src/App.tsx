import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import NewSample from "@/pages/NewSample";
import SamplesList from "@/pages/SamplesList";
import EditSample from "@/pages/EditSample";
import Targets from "@/pages/Targets";
import Settings from "@/pages/Settings";
import UserManagement from "@/pages/UserManagement";
import Links from "@/pages/Links";
import Login from "@/pages/Login";
import NotFound from "./pages/NotFound";
import { PagePermission } from "@/lib/auth";

const queryClient = new QueryClient();

function ProtectedRoute({ permission, children }: { permission: PagePermission; children: React.ReactNode }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  if (!user) return <Login />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<ProtectedRoute permission="dashboard"><Dashboard /></ProtectedRoute>} />
        <Route path="/new-sample" element={<ProtectedRoute permission="new_sample"><NewSample /></ProtectedRoute>} />
        <Route path="/samples" element={<ProtectedRoute permission="samples"><SamplesList /></ProtectedRoute>} />
        <Route path="/samples/:id" element={<ProtectedRoute permission="samples"><EditSample /></ProtectedRoute>} />
        <Route path="/targets" element={<ProtectedRoute permission="targets"><Targets /></ProtectedRoute>} />
        <Route path="/links" element={<ProtectedRoute permission="links"><Links /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute permission="settings"><Settings /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute permission="users"><UserManagement /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
