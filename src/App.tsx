import { useAuth } from "./hooks/useAuth";
import { AuthPage } from "./components/auth/AuthPage";
import { AppLayout } from "./components/layout/AppLayout";

export default function App() {
  const { currentUser, authReady, signOut } = useAuth();

  if (!authReady) return null;
  if (!currentUser) return <AuthPage />;
  return <AppLayout currentUser={currentUser} onSignOut={signOut} />;
}
