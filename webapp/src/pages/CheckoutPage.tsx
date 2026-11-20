import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, session } from "../api";
import type { Address, Order } from "../types";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session()) {
      setError("Log in to check out.");
      return;
    }
    api<Address[]>("/api/users/me/addresses").then((rows) => {
      setAddresses(rows);
      if (rows[0]) setAddressId(rows[0].id);
    }).catch((ex: Error) => setError(ex.message));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const order = await api<Order>("/api/orders/checkout", {
        method: "POST",
        body: JSON.stringify({ addressId })
      });
      window.dispatchEvent(new Event("apex-cart"));
      if (order.checkoutUrl?.includes("/pay/demo/")) {
        const paymentId = order.checkoutUrl.split("/").pop();
        navigate(`/pay/demo/${paymentId}`);
        return;
      }
      if (order.checkoutUrl) window.location.href = order.checkoutUrl;
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <header className="page-head">
        <h1>Checkout</h1>
        <p className="muted">Choose a saved address. Payment continues with CHIP, or the demo till when live keys are not configured.</p>
      </header>
      {error && <p className="toast error" role="alert"><span role="img" aria-label="Error">!</span> {error}</p>}
      {addresses.length === 0 ? <p>Add a delivery address in your <Link to="/account">account</Link> first.</p> : (
        <form className="panel" onSubmit={submit}>
          <div className="field">
            <label htmlFor="ship-to">Ship to</label>
            <select id="ship-to" name="addressId" aria-label="Address" autoComplete="shipping street-address" required value={addressId} onChange={(event) => setAddressId(event.target.value)}>
              {addresses.map((address) => <option key={address.id} value={address.id}>{address.snapshot}</option>)}
            </select>
          </div>
          <button className="btn" type="submit" disabled={busy}>{busy ? "Placing order…" : "Place order"}</button>
        </form>
      )}
    </section>
  );
}
