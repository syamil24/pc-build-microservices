import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, saveSession } from "../api";
import type { Session } from "../types";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await api<Session>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      saveSession(data);
      navigate("/");
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Login failed");
    }
  }

  return (
    <form className="panel" style={{ maxWidth: 420, marginTop: 28 }} onSubmit={submit}>
      <h1>Log in</h1>
      {error && <p className="error">{error}</p>}
      <label>Email<input aria-label="Email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Password<input aria-label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button className="btn" type="submit">Enter</button>
      <p className="muted">New here? <Link to="/register">Create an account</Link></p>
    </form>
  );
}
