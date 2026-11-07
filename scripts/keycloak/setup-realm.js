const fs = require("fs");
const path = require("path");

const base = (process.env.KEYCLOAK_URL || "http://localhost:8180").replace(/\/$/, "");
const adminUser = process.env.KEYCLOAK_ADMIN || "admin";
const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD;
const customerEmail = process.env.DEMO_CUSTOMER_EMAIL || "customer@apexbuild.local";
const adminEmail = process.env.DEMO_ADMIN_EMAIL || "admin@apexbuild.local";

if (!adminPassword) {
  console.error("KEYCLOAK_ADMIN_PASSWORD is empty");
  process.exit(1);
}
if (!process.env.DEMO_CUSTOMER_PASSWORD || !process.env.DEMO_ADMIN_PASSWORD) {
  console.error("Demo user passwords are empty");
  process.exit(1);
}

async function token() {
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: "admin-cli",
    username: adminUser,
    password: adminPassword
  });
  const response = await fetch(base + "/realms/master/protocol/openid-connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!response.ok) {
    throw new Error("Keycloak admin login failed (" + response.status + "). Set KEYCLOAK_ADMIN_PASSWORD to the master realm password.");
  }
  return (await response.json()).access_token;
}

async function api(access, method, urlPath, payload) {
  const response = await fetch(base + urlPath, {
    method,
    headers: {
      Authorization: "Bearer " + access,
      "Content-Type": "application/json"
    },
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(method + " " + urlPath + " -> " + response.status + " " + text.slice(0, 300));
  }
  return text ? JSON.parse(text) : null;
}

async function ensureShopIdAttribute(access) {
  const profile = await api(access, "GET", "/admin/realms/apex/users/profile");
  if (profile.attributes.some((item) => item.name === "apex_user_id")) return;
  profile.attributes.push({
    name: "apex_user_id",
    displayName: "Shop account id",
    permissions: { view: ["admin"], edit: ["admin"] },
    multivalued: false
  });
  await api(access, "PUT", "/admin/realms/apex/users/profile", profile);
}

async function ensureClientScopes(access) {
  const clients = await api(access, "GET", "/admin/realms/apex/clients?clientId=apex-web");
  const client = clients[0];
  if (!client) throw new Error("Client apex-web is missing");
  const logoutUris = "http://localhost:5173/##http://localhost:5173/*##http://127.0.0.1:5173/##http://127.0.0.1:5173/*";
  client.attributes = client.attributes || {};
  if (client.directAccessGrantsEnabled || client.attributes["post.logout.redirect.uris"] !== logoutUris) {
    client.directAccessGrantsEnabled = false;
    client.attributes["post.logout.redirect.uris"] = logoutUris;
    await api(access, "PUT", "/admin/realms/apex/clients/" + client.id, client);
  }
  const mappers = await api(access, "GET", "/admin/realms/apex/clients/" + client.id + "/protocol-mappers/models");
  if (!mappers.some((mapper) => mapper.name === "apex-user-id")) {
    await api(access, "POST", "/admin/realms/apex/clients/" + client.id + "/protocol-mappers/models", {
      name: "apex-user-id",
      protocol: "openid-connect",
      protocolMapper: "oidc-usermodel-attribute-mapper",
      config: {
        "user.attribute": "apex_user_id",
        "claim.name": "apex_user_id",
        "jsonType.label": "String",
        "multivalued": "false",
        "id.token.claim": "true",
        "access.token.claim": "true",
        "userinfo.token.claim": "true"
      }
    });
  }
  const assigned = await api(access, "GET", "/admin/realms/apex/clients/" + client.id + "/default-client-scopes");
  const have = new Set(assigned.map((scope) => scope.name));
  const available = await api(access, "GET", "/admin/realms/apex/clients/" + client.id + "/optional-client-scopes");
  for (const name of ["email", "profile", "roles"]) {
    if (have.has(name)) continue;
    const scope = available.find((item) => item.name === name) ||
      (await api(access, "GET", "/admin/realms/apex/client-scopes")).find((item) => item.name === name);
    if (!scope) throw new Error("Keycloak scope " + name + " is missing");
    await api(access, "PUT", "/admin/realms/apex/clients/" + client.id + "/default-client-scopes/" + scope.id);
  }
}

async function ensureUser(access, email, password, role, id, firstName) {
  const found = await api(access, "GET", "/admin/realms/apex/users?email=" + encodeURIComponent(email) + "&exact=true");
  let userId = found[0] && found[0].id;
  const profile = {
    username: email,
    email,
    enabled: true,
    emailVerified: true,
    requiredActions: [],
    firstName,
    lastName: "Apex",
    attributes: id ? { apex_user_id: [id] } : {}
  };
  if (!userId) {
    const created = await fetch(base + "/admin/realms/apex/users", {
      method: "POST",
      headers: { Authorization: "Bearer " + access, "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    if (created.status !== 201 && created.status !== 409) {
      const detail = await created.text();
      throw new Error("Could not create " + email + " (" + created.status + ") " + detail.slice(0, 200));
    }
    const again = await api(access, "GET", "/admin/realms/apex/users?email=" + encodeURIComponent(email) + "&exact=true");
    userId = again[0].id;
    console.log("Created " + role + " " + email);
  } else {
    profile.id = userId;
    await api(access, "PUT", "/admin/realms/apex/users/" + userId, profile);
    console.log(role + " " + email + " already exists");
  }
  await api(access, "PUT", "/admin/realms/apex/users/" + userId + "/reset-password", {
    type: "password",
    value: password,
    temporary: false
  });
  const roleRep = await api(access, "GET", "/admin/realms/apex/roles/" + role);
  await api(access, "POST", "/admin/realms/apex/users/" + userId + "/role-mappings/realm", [roleRep]);
}

async function main() {
  const access = await token();
  const realm = await fetch(base + "/admin/realms/apex", { headers: { Authorization: "Bearer " + access } });
  if (realm.status === 404) {
    const json = JSON.parse(fs.readFileSync(path.join(__dirname, "apex-realm.json"), "utf8"));
    await api(access, "POST", "/admin/realms", json);
    console.log("Created realm apex");
  } else if (!realm.ok) {
    throw new Error("Could not read realm apex (" + realm.status + ")");
  } else {
    console.log("Realm apex already exists");
  }
  try {
    await api(access, "POST", "/admin/realms/apex/roles-by-id/" + encodeURIComponent((await api(access, "GET", "/admin/realms/apex/roles/default-roles-apex")).id) + "/composites", [
      await api(access, "GET", "/admin/realms/apex/roles/CUSTOMER")
    ]);
    console.log("New accounts receive the CUSTOMER role");
  } catch (ex) {
    console.log("CUSTOMER is already a default role");
  }
  await ensureShopIdAttribute(access);
  await ensureClientScopes(access);
  await ensureUser(access, customerEmail, process.env.DEMO_CUSTOMER_PASSWORD, "CUSTOMER", process.env.APEX_CUSTOMER_ID || "", "Customer");
  await ensureUser(access, adminEmail, process.env.DEMO_ADMIN_PASSWORD, "ADMIN", process.env.APEX_ADMIN_ID || "", "Admin");
  console.log("Keycloak realm apex is ready");
}

main().catch((ex) => {
  console.error(ex.message || ex);
  process.exit(1);
});
