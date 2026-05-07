'use client';
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { fetchMe, login, register, setAuthTokens, setStoredUser } from "../../lib/auth";
import "../login/login.styles.scss";

/** Remember Me: email + username only (never the password). */
const REMEMBER_STORAGE_KEY = "eventmaster_register_remember";

function readRememberedRegister() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REMEMBER_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const email = typeof data?.email === "string" ? data.email : "";
    const username = typeof data?.username === "string" ? data.username : "";
    if (!email && !username) return null;
    return { email, username };
  } catch {
    return null;
  }
}

const ROLES = [
  { value: "attendee", label: "Attendee", hint: "Discover events and register for tickets." },
  { value: "organizer", label: "Organizer", hint: "Create events and manage attendees." },
  { value: "admin", label: "Admin", hint: "Moderate events and manage platform settings." },
];

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("attendee");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const saved = readRememberedRegister();
    if (saved) {
      setEmail(saved.email);
      setUsername(saved.username);
      setRemember(true);
    }
  }, []);

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    const emailTrim = email.trim();
    const usernameTrim = username.trim();
    setError("");
    setIsSubmitting(true);

    try {
      await register({
        email: emailTrim,
        username: usernameTrim,
        password,
        role,
      });

      const tokens = await login({ username: usernameTrim, password });
      setAuthTokens(tokens);
      const me = await fetchMe(tokens.access);
      setStoredUser(me);

      if (remember && (emailTrim || usernameTrim)) {
        localStorage.setItem(
          REMEMBER_STORAGE_KEY,
          JSON.stringify({ email: emailTrim, username: usernameTrim })
        );
      } else {
        localStorage.removeItem(REMEMBER_STORAGE_KEY);
      }

      router.replace("/dashboard");
    } catch (submitError) {
      setError(submitError.message || "Unable to register.");
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
          <h1 className="loginTitle">Register for Eventmaster</h1>
          <p className="loginSubtitle">
            Let&apos;s fill out a few details, and we&apos;ll get you on your way to your next memorable experience.
          </p>

          <form className="loginForm" onSubmit={handleRegisterSubmit}>
            <div className="loginField">
              <label htmlFor="register-email" className="loginLabel">
                Email Address
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                className="loginInput"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="loginField">
              <label htmlFor="register-username" className="loginLabel">
                Username
              </label>
              <input
                id="register-username"
                name="username"
                type="text"
                autoComplete="username"
                className="loginInput"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="loginField">
              <label htmlFor="register-password" className="loginLabel">
                Password
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                className="loginInput"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <fieldset className="loginRoleFieldset">
              <legend className="loginRoleLegend" id="register-role-legend">
                Account type
              </legend>
              <p className="loginRoleHint">
                Choose how you will use Eventmaster. You can change attendee and organizer later in
                settings.
              </p>
              <div className="loginRoleList" role="radiogroup" aria-labelledby="register-role-legend">
                {ROLES.map((item) => (
                  <label key={item.value} className="loginRoleOption">
                    <input
                      type="radio"
                      name="role"
                      value={item.value}
                      checked={role === item.value}
                      onChange={() => setRole(item.value)}
                    />
                    <span>
                      <strong>{item.label}</strong> — {item.hint}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

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
            </div>

            {error && <p role="alert">{error}</p>}
            <button type="submit" className="loginSubmit" disabled={isSubmitting}>
              {isSubmitting ? "Creating Account..." : "Register"}
            </button>
          </form>

          <p className="loginRegister">
            Already have an account?{" "}
            <Link href="/login" className="loginRegisterLink">
              Login
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
