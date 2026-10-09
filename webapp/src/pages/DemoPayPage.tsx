import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

export default function DemoPayPage() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("This till stands in for CHIP until live keys are configured.");

  async function pay(success: boolean) {
    try {
      const payment = await api<{ orderId: string }>(`/api/payments/demo/${paymentId}/confirm`, {
        method: "POST",
        body: JSON.stringify({ success })
      });
      navigate(`/orders/${payment.orderId}`);
    } catch (ex) {
      setMessage(ex instanceof Error ? ex.message : "Payment failed");
    }
  }

  return (
    <section className="panel" style={{ marginTop: 28 }}>
      <div className="kicker">Demo checkout</div>
      <h1>Confirm the payment</h1>
      <p className="muted">{message}</p>
      <div className="row">
        <button className="btn" onClick={() => pay(true)}>Pay now</button>
        <button className="ghost" onClick={() => pay(false)}>Fail the payment</button>
      </div>
    </section>
  );
}
