import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

export default function DemoPayPage() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("This till stands in for CHIP until live keys are configured.");
  const [busy, setBusy] = useState(false);

  async function pay(success: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const payment = await api<{ orderId: string }>(`/api/payments/demo/${paymentId}/confirm`, {
        method: "POST",
        body: JSON.stringify({ success })
      });
      navigate(`/orders/${payment.orderId}`);
    } catch (ex) {
      setMessage(ex instanceof Error ? ex.message : "Payment failed");
      setBusy(false);
    }
  }

  return (
    <section className="panel auth-card">
      <p className="kicker">Demo checkout</p>
      <h1>Confirm the payment</h1>
      <p className="muted" role="status">{message}</p>
      <div className="row">
        <button className="btn" type="button" disabled={busy} onClick={() => pay(true)}>Pay now</button>
        <button className="ghost" type="button" disabled={busy} onClick={() => pay(false)}>Fail the payment</button>
      </div>
    </section>
  );
}
