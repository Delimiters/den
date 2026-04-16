import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthPage } from "./AuthPage";

// Mock the useAuth hook so AuthPage is tested in isolation from Supabase
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    currentUser: null,
    signIn: mockSignIn,
    signUp: mockSignUp,
    signOut: vi.fn(),
  }),
}));

beforeEach(() => {
  mockSignIn.mockReset();
  mockSignUp.mockReset();
  // Default: auth succeeds (returns null error)
  mockSignIn.mockResolvedValue(null);
  mockSignUp.mockResolvedValue(null);
});

// ─── Login mode (default) ────────────────────────────────────────────────────

describe("AuthPage — login mode", () => {
  it("renders the login form by default", () => {
    render(<AuthPage />);
    expect(screen.getByText("Welcome back!")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("does not show the username field in login mode", () => {
    render(<AuthPage />);
    expect(screen.queryByPlaceholderText("cooluser123")).not.toBeInTheDocument();
  });

  it("calls signIn with email and password on submit", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(screen.getByPlaceholderText("you@example.com"), "jake@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("jake@example.com", "hunter2");
    });
  });

  it("displays an error message when signIn returns an error", async () => {
    mockSignIn.mockResolvedValue({ message: "Invalid login credentials" });
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(screen.getByPlaceholderText("you@example.com"), "bad@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid login credentials")).toBeInTheDocument();
    });
  });
});

// ─── Register mode ────────────────────────────────────────────────────────────

describe("AuthPage — register mode", () => {
  async function switchToRegister() {
    const user = userEvent.setup();
    render(<AuthPage />);
    await user.click(screen.getByText("Register"));
    return user;
  }

  it("shows the register form after clicking Register link", async () => {
    await switchToRegister();
    expect(screen.getByText("Create an account")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("cooluser123")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("calls signUp with email, password, and username", async () => {
    const user = await switchToRegister();

    await user.type(screen.getByPlaceholderText("cooluser123"), "jakeh");
    await user.type(screen.getByPlaceholderText("you@example.com"), "jake@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "securepassword");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        "jake@example.com",
        "securepassword",
        "jakeh"
      );
    });
  });

  it("displays a signup error when signUp returns an error", async () => {
    mockSignUp.mockResolvedValue({ message: "User already exists" });
    const user = await switchToRegister();

    await user.type(screen.getByPlaceholderText("cooluser123"), "jakeh");
    await user.type(screen.getByPlaceholderText("you@example.com"), "jake@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "password");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("User already exists")).toBeInTheDocument();
    });
  });

  it("clears the error when switching between login and register", async () => {
    mockSignIn.mockResolvedValue({ message: "Bad credentials" });
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(screen.getByPlaceholderText("you@example.com"), "x@x.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "x");
    await user.click(screen.getByRole("button", { name: "Log In" }));
    await waitFor(() => expect(screen.getByText("Bad credentials")).toBeInTheDocument());

    // Switch to register — error should disappear
    await user.click(screen.getByText("Register"));
    expect(screen.queryByText("Bad credentials")).not.toBeInTheDocument();
  });
});
