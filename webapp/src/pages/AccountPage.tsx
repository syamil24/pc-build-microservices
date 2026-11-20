import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { Address, Profile } from "../types";

const empty = { label: "Home", line1: "", line2: "", city: "", state: "", postalCode: "", country: "MY" };

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function load() {
    setProfile(await api<Profile>("/api/users/me"));
    setAddresses(await api<Address[]>("/api/users/me/addresses"));
  }

  useEffect(() => { load().catch((ex: Error) => setError(ex.message)); }, []);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setError("");
    setSaved("");
    try {
      await api("/api/users/me", { method: "PUT", body: JSON.stringify({ fullName: profile.fullName, phone: profile.phone }) });
      setSaved("Profile saved.");
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Could not save your profile");
    }
  }

  async function addAddress(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved("");
    try {
      await api("/api/users/me/addresses", { method: "POST", body: JSON.stringify(form) });
      setForm(empty);
      setSaved("Address added.");
      await load();
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Could not add that address");
    }
  }

  return (
    <section className="split">
      <form className="panel" onSubmit={saveProfile}>
        <h1>Account</h1>
        {error && <p className="toast error" role="alert"><span role="img" aria-label="Error">!</span> {error}</p>}
        {saved && <p className="toast ok" role="status"><span role="img" aria-label="Success">✓</span> {saved}</p>}
        <div className="field">
          <label htmlFor="full-name">Name</label>
          <input id="full-name" name="name" aria-label="Full name" autoComplete="name" aria-invalid="false" value={profile?.fullName ?? ""} onChange={(event) => setProfile(profile ? { ...profile, fullName: event.target.value } : profile)} />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" aria-label="Phone" autoComplete="tel" inputMode="tel" aria-invalid="false" value={profile?.phone ?? ""} onChange={(event) => setProfile(profile ? { ...profile, phone: event.target.value } : profile)} />
        </div>
        <button className="btn" type="submit">Save profile</button>
      </form>
      <form className="panel" onSubmit={addAddress}>
        <h2>New address</h2>
        <div className="field">
          <label htmlFor="address-label">Label</label>
          <input id="address-label" name="address-label" aria-label="label" autoComplete="off" required aria-invalid="false" data-error="label-error" value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
          <p id="label-error" className="error-msg"><span role="img" aria-label="Error">!</span> Enter a name for this address, such as Home.</p>
        </div>
        <div className="field">
          <label htmlFor="line1">Address line 1</label>
          <input id="line1" name="address-line1" aria-label="line1" autoComplete="address-line1" required aria-invalid="false" data-error="line1-error" value={form.line1} onChange={(event) => setForm({ ...form, line1: event.target.value })} />
          <p id="line1-error" className="error-msg"><span role="img" aria-label="Error">!</span> Enter the street address.</p>
        </div>
        <div className="field">
          <label htmlFor="line2">Address line 2</label>
          <input id="line2" name="address-line2" aria-label="line2" autoComplete="address-line2" aria-invalid="false" value={form.line2} onChange={(event) => setForm({ ...form, line2: event.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="city">City</label>
          <input id="city" name="city" aria-label="city" autoComplete="address-level2" required aria-invalid="false" data-error="city-error" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          <p id="city-error" className="error-msg"><span role="img" aria-label="Error">!</span> Enter a city.</p>
        </div>
        <div className="field">
          <label htmlFor="state">State</label>
          <input id="state" name="state" aria-label="state" autoComplete="address-level1" required aria-invalid="false" data-error="state-error" value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} />
          <p id="state-error" className="error-msg"><span role="img" aria-label="Error">!</span> Enter a state.</p>
        </div>
        <div className="field">
          <label htmlFor="postal">Postal code</label>
          <input id="postal" name="postal-code" aria-label="postalCode" autoComplete="postal-code" inputMode="numeric" required aria-invalid="false" data-error="postal-error" value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} />
          <p id="postal-error" className="error-msg"><span role="img" aria-label="Error">!</span> Enter a postal code.</p>
        </div>
        <div className="field">
          <label htmlFor="country">Country</label>
          <input id="country" name="country" aria-label="country" autoComplete="country" required aria-invalid="false" data-error="country-error" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
          <p id="country-error" className="error-msg"><span role="img" aria-label="Error">!</span> Enter a country code, such as MY.</p>
        </div>
        <button className="btn" type="submit">Add address</button>
        <ul>{addresses.map((address) => <li key={address.id}>{address.snapshot}</li>)}</ul>
      </form>
    </section>
  );
}
