import { useEffect, useMemo, useState } from "react";
import { api, formatMyr, session } from "../api";
import type { Category, Page, Product, Quote } from "../types";

const SLOT_ORDER = ["CPU", "MOTHERBOARD", "RAM", "GPU", "STORAGE", "PSU", "CASE", "COOLING"];

export default function BuilderPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [active, setActive] = useState("CPU");
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [picked, setPicked] = useState<Record<string, Product | undefined>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<Category[]>("/api/catalog/categories").then((rows) => {
      setCategories(rows.filter((row) => row.builderSlot));
    }).catch((ex: Error) => setMessage(ex.message));
  }, []);

  useEffect(() => {
    api<Page<Product>>(`/api/catalog/products?category=${active}&size=48`).then((page) => setCatalog(page.items));
  }, [active]);

  const lines = useMemo(() => Object.values(picked).flatMap((product) => product ? [{ productId: product.id, quantity: 1 }] : []), [picked]);

  useEffect(() => {
    if (lines.length === 0) {
      setQuote(null);
      return;
    }
    const handle = setTimeout(() => {
      api<Quote>("/api/catalog/builder/quote", { method: "POST", body: JSON.stringify({ lines }) })
        .then(setQuote)
        .catch((ex: Error) => setMessage(ex.message));
    }, 250);
    return () => clearTimeout(handle);
  }, [lines]);

  async function addBuild() {
    if (!session()) {
      setMessage("Log in before sending the build to the cart.");
      return;
    }
    if (!quote?.ok) {
      setMessage("Resolve the compatibility errors first.");
      return;
    }
    try {
      await api("/api/cart/builds", {
        method: "POST",
        body: JSON.stringify({ buildId: crypto.randomUUID(), lines })
      });
      window.dispatchEvent(new Event("apex-cart"));
      setMessage("Build added to the cart.");
    } catch (ex) {
      setMessage(ex instanceof Error ? ex.message : "Could not add the build");
    }
  }

  const load = quote?.psuWatts ? Math.min(100, Math.round((quote.estimatedWatts / quote.psuWatts) * 100)) : quote ? 40 : 0;

  return (
    <section>
      <h1>PC builder</h1>
      <p className="muted">One slot at a time. The quote on the right is the price you will pay.</p>
      {message && <p>{message}</p>}
      <div className="builder">
        <div>
          {SLOT_ORDER.map((code) => (
            <button key={code} className={code === active ? "slot on" : "slot"} onClick={() => setActive(code)}>
              <strong>{categories.find((item) => item.code === code)?.name || code}</strong>
              <div className="muted">{picked[code]?.name || "Empty slot"}</div>
            </button>
          ))}
        </div>
        <div className="grid">
          {catalog.map((product) => (
            <button key={product.id} className="panel card" onClick={() => setPicked((current) => ({ ...current, [active]: product }))}>
              <div className="pill">{product.brand}</div>
              <h3>{product.name}</h3>
              <div className="price">{formatMyr(product.priceCents)}</div>
            </button>
          ))}
        </div>
        <aside className="panel summary">
          <div className="kicker">Live total</div>
          <div className="price">{formatMyr(quote?.totalCents ?? 0)}</div>
          <div className="muted">Draw {quote?.estimatedWatts ?? 0}W · suggested PSU {quote?.recommendedPsuWatts ?? 0}W</div>
          <div className="bar"><span style={{ width: `${load}%` }} /></div>
          <ul>
            {quote?.issues.map((issue) => (
              <li key={issue.message} className={issue.severity === "ERROR" ? "error" : "warn"}>{issue.message}</li>
            ))}
            {quote?.ok && <li className="ok">Parts agree with each other.</li>}
          </ul>
          <button className="btn" disabled={!quote?.ok} onClick={addBuild}>Add build to cart</button>
        </aside>
      </div>
    </section>
  );
}
