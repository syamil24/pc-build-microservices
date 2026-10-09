import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, saveSession } from "../api";
import type { Session } from "../types";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await api<Session>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ fullName, email, password })
      });
      saveSession(data);
      navigate("/account");
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Could not register");
    }
  }

  return (
    <form className="panel" style={{ maxWidth: 420, marginTop: 28 }} onSubmit={submit}>
      <h1>Create account</h1>
      {error && <p className="error">{error}</p>}
      <label>Name<input aria-label="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
      <label>Email<input aria-label="Email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Password<input aria-label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button className="btn" type="submit">Register</button>
    </form>
  );
}
