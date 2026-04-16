import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/appStore";
import type { User } from "../types";

export function useAuth() {
  const { currentUser, setCurrentUser } = useAppStore();

  useEffect(() => {
    // Load initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUser(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchUser(session.user.id);
        } else {
          setCurrentUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUser(id: string) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    if (data) setCurrentUser(data as User);
  }

  async function signUp(email: string, password: string, username: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: username },
      },
    });
    return error;
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { currentUser, signUp, signIn, signOut };
}
