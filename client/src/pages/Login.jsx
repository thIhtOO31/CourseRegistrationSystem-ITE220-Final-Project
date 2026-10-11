import { useState } from "react";
import { apiRequest } from "../api";
import StatusMessage from "../components/StatusMessage";

export default function Login({
  onLogin,
  message
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check login details and show any errors
  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiRequest(
        "/auth/login",
        {
          method: "POST",
          body: {
            email,
            password
          }
        }
      );
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  return <main className="login-page">
      <form className="card login-card" onSubmit={submit}>
      <img className="login-mark" src="/wu-logo.png" alt="WU" />
      <h1>Wakanda University</h1>
      <p>Welcome back. Sign in to the course registration portal.</p>
      <StatusMessage>{message}</StatusMessage>
      <StatusMessage type="error">{error}</StatusMessage>
      <label>
          Email
          <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="username"
        />
        </label>
      <label>
          Password
          <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        </label>
      <button type="submit" disabled={loading}>{loading ? "Signing in..." : "Login"}</button>
    </form>
    </main>;
}