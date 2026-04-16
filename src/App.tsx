import { useAuth } from "./hooks/useAuth";
import { AuthPage } from "./components/auth/AuthPage";
import { AppLayout } from "./components/layout/AppLayout";

export default function App() {
  const { currentUser, signOut } = useAuth();

  if (!currentUser) return <AuthPage />;
  return <AppLayout currentUser={currentUser} onSignOut={signOut} />;
}
