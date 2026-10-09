import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { Address, Profile } from "../types";

const empty = { label: "Home", line1: "", line2: "", city: "", state: "", postalCode: "", country: "MY" };

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  async function load() {
    setProfile(await api<Profile>("/api/users/me"));
    setAddresses(await api<Address[]>("/api/users/me/addresses"));
  }

  useEffect(() => { load().catch((ex: Error) => setError(ex.message)); }, []);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    await api("/api/users/me", { method: "PUT", body: JSON.stringify({ fullName: profile.fullName, phone: profile.phone }) });
  }

  async function addAddress(event: FormEvent) {
    event.preventDefault();
    await api("/api/users/me/addresses", { method: "POST", body: JSON.stringify(form) });
    setForm(empty);
    await load();
  }

  return (
    <section className="split" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <form className="panel" onSubmit={saveProfile}>
        <h1>Account</h1>
        {error && <p className="error">{error}</p>}
        <label>Name<input aria-label="Full name" value={profile?.fullName ?? ""} onChange={(event) => setProfile(profile ? { ...profile, fullName: event.target.value } : profile)} /></label>
        <label>Phone<input aria-label="Phone" value={profile?.phone ?? ""} onChange={(event) => setProfile(profile ? { ...profile, phone: event.target.value } : profile)} /></label>
        <button className="btn" type="submit">Save profile</button>
      </form>
      <form className="panel" onSubmit={addAddress}>
        <h2>New address</h2>
        {(["label", "line1", "city", "state", "postalCode", "country"] as const).map((field) => (
          <label key={field}>{field}
            <input aria-label={field} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
          </label>
        ))}
        <button className="btn" type="submit">Add address</button>
        <ul>{addresses.map((address) => <li key={address.id}>{address.snapshot}</li>)}</ul>
      </form>
    </section>
  );
}
