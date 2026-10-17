import { Link } from "react-router-dom";
import { beginKeycloakLogin } from "../keycloak";

export default function RegisterPage() {
  return (
    <div className="panel" style={{ maxWidth: 460, marginTop: 28 }}>
      <h1>Create an account</h1>
      <p className="muted">Registration opens the Keycloak form. A new account is a customer.</p>
      <button className="btn" type="button" onClick={() => beginKeycloakLogin(true)}>Register with Keycloak</button>
      <p className="muted">Already registered? <Link to="/login">Log in</Link></p>
    </div>
  );
}
