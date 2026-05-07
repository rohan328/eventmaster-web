'use client';
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import {
  clearAuthTokens,
  fetchMe,
  getAccessToken,
  login,
  setAuthTokens,
  setStoredUser,
} from "../../lib/auth";
import "./login.styles.scss";

/** Remember Me: only the username/email is stored (never the password). */
const REMEMBER_STORAGE_KEY = "eventmaster_login_remember";

function readRememberedEmail() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REMEMBER_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return typeof data?.email === "string" ? data.email : null;
  } catch {
    return null;
  }
}
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const saved = readRememberedEmail();
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  useEffect(() => {
    const existingAccess = getAccessToken();
    if (!existingAccess) return;

    fetchMe(existingAccess)
      .then((me) => {
        setStoredUser(me);
        router.replace(searchParams.get("next") || "/dashboard");
      })
      .catch(() => {});
  }, [router, searchParams]);

  async function handleLoginSubmit(e) {
    e.preventDefault();
    const trimmed = email.trim();
    setError("");
    setIsSubmitting(true);

    try {
      const tokens = await login({ username: trimmed, password });
      setAuthTokens(tokens);
      const me = await fetchMe(tokens.access);
      setStoredUser(me);

      if (remember && trimmed) {
        localStorage.setItem(
          REMEMBER_STORAGE_KEY,
          JSON.stringify({ email: trimmed })
        );
      } else {
        localStorage.removeItem(REMEMBER_STORAGE_KEY);
      }

      router.replace(searchParams.get("next") || "/dashboard");
    } catch (submitError) {
      // Prevent stale sessions from keeping a user authenticated after a failed login attempt.
      clearAuthTokens();
      setError(submitError.message || "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="loginRoot">
      <div className="loginBg" aria-hidden>
        <div className="loginBgBlob loginBgBlobTop" />
        <div className="loginBgBlob loginBgBlobBottom" />
      </div>

      <Navbar />

      <main className="loginMain">
        <div className="loginCard">
          <div className="loginBrandIcon">
            <img
              src="/assets/logo-alt.svg"
              alt=""
              className="loginBrandIconImg"
              width={64}
              height={64}
              aria-hidden
            />
          </div>
          <h1 className="loginTitle">Welcome to Eventmaster</h1>
          <p className="loginSubtitle">
            Purchase your entry to your next experience, hassle free. Let&apos;s fill out your details and get you on track.
          </p>

          <form className="loginForm" onSubmit={handleLoginSubmit}>
            <div className="loginField">
              <label htmlFor="login-email" className="loginLabel">
                Username
              </label>
              <input
                id="login-email"
                name="email"
                type="text"
                autoComplete="username"
                className="loginInput"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="loginField">
              <label htmlFor="login-password" className="loginLabel">
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="loginInput"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="loginRow">
              <label className="loginRemember">
                <input
                  type="checkbox"
                  className="loginCheckbox"
                  name="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember Me
              </label>
              <button type="button" className="loginForgot">
                Forgot Password?
              </button>
            </div>

            {error && <p role="alert">{error}</p>}
            <button type="submit" className="loginSubmit" disabled={isSubmitting}>
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <p className="loginRegister">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="loginRegisterLink">
              Register
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
