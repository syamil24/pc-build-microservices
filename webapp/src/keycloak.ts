const ISSUER = (import.meta.env.VITE_KEYCLOAK_ISSUER || "http://localhost:8180/realms/apex").replace(/\/$/, "");
const CLIENT = import.meta.env.VITE_KEYCLOAK_CLIENT || "apex-web";

function base64url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function claimsOf(accessToken: string) {
  const payload = accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

export function sessionFromTokens(accessToken: string, refreshToken: string) {
  const claims = claimsOf(accessToken);
  const roles: string[] = claims.realm_access?.roles ?? [];
  return {
    accessToken,
    refreshToken,
    email: claims.email || claims.preferred_username,
    role: roles.includes("ADMIN") ? "ADMIN" : "CUSTOMER"
  };
}

export function keycloakLogoutUrl() {
  const redirect = `${window.location.origin}/`;
  const params = new URLSearchParams({
    client_id: CLIENT,
    post_logout_redirect_uri: redirect
  });
  return `${ISSUER}/protocol/openid-connect/logout?${params}`;
}

export async function beginKeycloakLogin(register = false) {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  sessionStorage.setItem("apex.pkce", verifier);
  const redirect = `${window.location.origin}/auth/callback`;
  const params = new URLSearchParams({
    client_id: CLIENT,
    redirect_uri: redirect,
    response_type: "code",
    scope: "openid email profile",
    code_challenge: base64url(new Uint8Array(digest)),
    code_challenge_method: "S256"
  });
  const path = register ? "/protocol/openid-connect/registrations" : "/protocol/openid-connect/auth";
  window.location.assign(`${ISSUER}${path}?${params}`);
}

async function tokenRequest(body: URLSearchParams) {
  const response = await fetch(`${ISSUER}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!response.ok) {
    throw new Error("Keycloak rejected the sign-in");
  }
  return response.json();
}

export async function finishKeycloakLogin(code: string) {
  const verifier = sessionStorage.getItem("apex.pkce") || "";
  const tokens = await tokenRequest(new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT,
    code,
    redirect_uri: `${window.location.origin}/auth/callback`,
    code_verifier: verifier
  }));
  sessionStorage.removeItem("apex.pkce");
  localStorage.setItem("apex.idp", "keycloak");
  return sessionFromTokens(tokens.access_token, tokens.refresh_token);
}

export async function refreshKeycloak(refreshToken: string) {
  try {
    const tokens = await tokenRequest(new URLSearchParams({
      grant_type: "refresh_token",
      client_id: CLIENT,
      refresh_token: refreshToken
    }));
    localStorage.setItem("apex.idp", "keycloak");
    return sessionFromTokens(tokens.access_token, tokens.refresh_token || refreshToken);
  } catch {
    return null;
  }
}
