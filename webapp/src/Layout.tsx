import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { api, clearSession, session } from "./api";
import type { Cart } from "./types";

export default function Layout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(session()?.email ?? null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setEmail(session()?.email ?? null);
    window.addEventListener("apex-auth", sync);
    window.addEventListener("apex-cart", () => refreshCart());
    refreshCart();
    return () => {
      window.removeEventListener("apex-auth", sync);
      window.removeEventListener("apex-cart", () => refreshCart());
    };
  }, []);

  async function refreshCart() {
    if (!session()) {
      setCount(0);
      return;
    }
    try {
      const cart = await api<Cart>("/api/cart");
      setCount(cart.lines.reduce((sum, line) => sum + line.quantity, 0));
    } catch {
      setCount(0);
    }
  }

  return (
    <>
      <header className="shell nav">
        <NavLink to="/" className="brand">APEX<span>BUILD</span></NavLink>
        <NavLink to="/shop">Shop</NavLink>
        <NavLink to="/builder">PC Builder</NavLink>
        <NavLink to="/platform">Live ops</NavLink>
        <div className="spacer" />
        <NavLink to="/cart">Cart ({count})</NavLink>
        {email ? (
          <>
            <NavLink to="/orders">Orders</NavLink>
            <NavLink to="/account">{email}</NavLink>
            <button className="ghost" onClick={() => { clearSession(); navigate("/"); }}>Log out</button>
          </>
        ) : (
          <NavLink to="/login" className="btn">Log in</NavLink>
        )}
      </header>
      <main className="shell">
        <Outlet />
      </main>
      <footer className="shell">Apex Build · custom rigs, laptops, and parts · prices in MYR</footer>
    </>
  );
}
