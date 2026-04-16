import { useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const err =
      mode === "login"
        ? await signIn(email, password)
        : await signUp(email, password, username);

    setLoading(false);
    if (err) setError(err.message);
  }

  return (
    <div className="h-full flex items-center justify-center bg-main">
      <div className="bg-overlay rounded-lg p-8 w-full max-w-sm shadow-2xl">
        <h1 className="text-text-primary text-2xl font-bold text-center mb-1">
          {mode === "login" ? "Welcome back!" : "Create an account"}
        </h1>
        <p className="text-text-muted text-sm text-center mb-6">
          {mode === "login"
            ? "We're so excited to see you again!"
            : "Welcome to Den."}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "register" && (
            <div className="flex flex-col gap-1">
              <label className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-input-bg text-text-primary rounded px-3 py-2 outline-none focus:ring-2 focus:ring-accent text-sm"
                placeholder="cooluser123"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-input-bg text-text-primary rounded px-3 py-2 outline-none focus:ring-2 focus:ring-accent text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-input-bg text-text-primary rounded px-3 py-2 outline-none focus:ring-2 focus:ring-accent text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-danger text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-accent hover:bg-accent-hover text-white font-semibold py-2 rounded transition-colors disabled:opacity-60 mt-1"
          >
            {loading
              ? "..."
              : mode === "login"
              ? "Log In"
              : "Continue"}
          </button>
        </form>

        <p className="text-text-muted text-xs mt-4">
          {mode === "login" ? (
            <>
              Need an account?{" "}
              <button
                className="text-text-link hover:underline"
                onClick={() => { setMode("register"); setError(null); }}
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                className="text-text-link hover:underline"
                onClick={() => { setMode("login"); setError(null); }}
              >
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
