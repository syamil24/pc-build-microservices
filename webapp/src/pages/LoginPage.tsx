import { Link } from "react-router-dom";
import { beginKeycloakLogin } from "../keycloak";

export default function LoginPage() {
  return (
    <div className="panel auth-card">
      <h1>Log in</h1>
      <p className="muted">The shop signs in with Keycloak. Customers and admins are still separate roles.</p>
      <button className="btn" type="button" onClick={() => beginKeycloakLogin(false)}>Continue to Keycloak</button>
      <p className="muted">New here? <Link to="/register">Create an account</Link></p>
    </div>
  );
}
