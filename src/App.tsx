import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Home } from "./pages/Home";
import { Discover } from "./pages/Discover";
import { Sparks } from "./pages/Sparks";
import { Composer } from "./pages/Composer";
import { Profile } from "./pages/Profile";
import { EditProfile } from "./pages/EditProfile";
import { Messages } from "./pages/Messages";
import { Notifications } from "./pages/Notifications";
import { Auth } from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<Home />} />
            <Route path="discover" element={<Discover />} />
            <Route path="sparks" element={<Sparks />} />
            <Route path="composer" element={<Composer />} />
            <Route path="profile" element={<Profile />} />
            <Route path="profile/edit" element={<EditProfile />} />
            <Route path="messages" element={<Messages />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
