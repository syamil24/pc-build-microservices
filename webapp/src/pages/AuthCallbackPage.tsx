import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, saveSession } from "../api";
import { finishKeycloakLogin } from "../keycloak";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error_description") || params.get("error");
    if (!code) {
      setMessage(error || "Keycloak did not return a login code.");
      return;
    }
    finishKeycloakLogin(code)
      .then((session) => {
        saveSession(session);
        return api("/api/auth/me");
      })
      .then(() => navigate("/"))
      .catch((ex: Error) => setMessage(ex.message));
  }, [navigate]);

  return <p>{message}</p>;
}
