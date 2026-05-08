import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAuth } from "./hooks/useAuth";
import { AuthPage } from "./components/auth/AuthPage";
import { AppLayout } from "./components/layout/AppLayout";
import { Splashscreen } from "./components/ui/Splashscreen";

function MainApp() {
  const { currentUser, authReady, signOut } = useAuth();

  if (!authReady) return null;
  if (!currentUser) return <AuthPage />;
  return <AppLayout currentUser={currentUser} onSignOut={signOut} />;
}

export default function App() {
  if (isTauri() && getCurrentWindow().label === "splashscreen") {
    return <Splashscreen />;
  }
  return <MainApp />;
}
