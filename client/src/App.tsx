import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SpecProvider } from "./context/SpecContext";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "sonner";
import { useAuth } from "@clerk/clerk-react";
import { Landing } from "./views/Landing";
import { AppLayout } from "./views/app/AppLayout";
import { Playground } from "./views/app/Playground";
import { History } from "./views/app/History";

const Settings = () => <div className="p-8">Settings View</div>;
const SharedSpec = () => <div className="p-8">Shared Spec View</div>;

import { FullPageLoader } from "./components/ui/Loader";

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <FullPageLoader text="Verifying authentication..." />;
  if (!isSignedIn) return <Navigate to="/" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SpecProvider>
          <div className="min-h-screen bg-base text-primary flex flex-col">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/s/:token" element={<SharedSpec />} />

              {/* Protected Workspace Routes */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Playground />} />
                <Route path="history" element={<History />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </div>
          <Toaster theme="dark" position="bottom-right" />
        </SpecProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
