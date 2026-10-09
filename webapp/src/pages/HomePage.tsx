import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <section className="hero">
      <div>
        <div className="kicker">PC builder shop</div>
        <h1>BUILD THE RIG.<br />SEE THE PRICE.</h1>
        <p className="lede">
          Pick a processor, board, memory, graphics card, and the rest of the stack.
          Apex checks sockets, memory type, case fit, and power before you pay.
        </p>
        <div className="row">
          <Link to="/builder" className="btn">Open the builder</Link>
          <Link to="/shop" className="ghost">Browse laptops and parts</Link>
        </div>
        <div className="stat-row">
          <div className="panel stat"><strong>Live quote</strong><span className="muted">Compatibility and wattage update as you pick parts.</span></div>
          <div className="panel stat"><strong>CHIP</strong><span className="muted">Checkout hands off to CHIP, or the local demo tiller.</span></div>
          <div className="panel stat"><strong>Tracked</strong><span className="muted">An emulated courier walks the parcel across the hubs.</span></div>
        </div>
      </div>
      <aside className="panel">
        <div className="kicker">Tonight's loadout</div>
        <h2>1440p silent</h2>
        <p className="muted">Voltedge V6, B650 Strike, 32GB DDR5, Helix H70, 750W.</p>
        <p className="price">From the builder</p>
        <Link to="/builder" className="btn">Start from an empty bench</Link>
      </aside>
    </section>
  );
}
