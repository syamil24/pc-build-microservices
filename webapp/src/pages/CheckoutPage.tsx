import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, session } from "../api";
import type { Address, Order } from "../types";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [error, setError] = useState("");

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
    }
  }

  return (
    <section>
      <h1>Checkout</h1>
      {error && <p className="error">{error}</p>}
      {addresses.length === 0 ? <p>Add a delivery address in your account first.</p> : (
        <form className="panel" onSubmit={submit}>
          <label>Ship to
            <select aria-label="Address" value={addressId} onChange={(event) => setAddressId(event.target.value)}>
              {addresses.map((address) => <option key={address.id} value={address.id}>{address.snapshot}</option>)}
            </select>
          </label>
          <button className="btn" type="submit">Place order</button>
        </form>
      )}
    </section>
  );
}
