import { useEffect, useState, type FormEvent } from "react";
import { api, download, formatMyr } from "../../api";
import type { Category, SalesReport } from "../../types";

function recentMonths() {
  const months: string[] = [];
  const cursor = new Date();
  cursor.setDate(1);
  for (let i = 0; i < 12; i += 1) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return months;
}

export default function ReportsPage() {
  const months = recentMonths();
  const [month, setMonth] = useState(months[0]);
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Category[]>("/api/catalog/categories").then(setCategories).catch((ex: Error) => setError(ex.message));
  }, []);

  async function generate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const params = new URLSearchParams({ month });
    if (category) params.set("category", category);
    try {
      setReport(await api<SalesReport>(`/api/reports/sales?${params}`));
    } catch (ex) {
      setReport(null);
      setError(ex instanceof Error ? ex.message : "Could not build the report");
    } finally {
      setBusy(false);
    }
  }

  async function pdf() {
    const params = new URLSearchParams({ month });
    if (category) params.set("category", category);
    try {
      await download(`/api/reports/sales.pdf?${params}`, `apex-sales-${month}${category ? "-" + category : ""}.pdf`);
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Could not download the PDF");
    }
  }

  return (
    <section className="panel">
      <h2>Sales report</h2>
      <p className="muted">Jasper builds the PDF from paid lines stored by the report service. Filter by month and, if you want, one category.</p>
      <form className="row" onSubmit={generate}>
        <label>Month
          <select value={month} onChange={(event) => setMonth(event.target.value)}>
            {months.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All</option>
            {categories.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </label>
        <button className="btn" type="submit" disabled={busy}>{busy ? "Building" : "Generate"}</button>
        <button className="ghost" type="button" onClick={pdf}>Download PDF</button>
      </form>
      {error && <p className="error">{error}</p>}
      {report && (
        <>
          <div className="stat-row">
            <div className="panel stat"><strong>{report.orderCount}</strong><span className="muted">Orders</span></div>
            <div className="panel stat"><strong>{report.unitCount}</strong><span className="muted">Units</span></div>
            <div className="panel stat"><strong>{formatMyr(report.totalCents)}</strong><span className="muted">Revenue</span></div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Category</th><th>SKU</th><th>Product</th><th>Units</th><th>Revenue</th></tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.sku}>
                    <td>{row.categoryCode}</td>
                    <td>{row.sku}</td>
                    <td>{row.productName}</td>
                    <td>{row.quantity}</td>
                    <td>{formatMyr(row.revenueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {report.rows.length === 0 && <p className="muted">No paid lines in {report.month} for {report.category}.</p>}
        </>
      )}
    </section>
  );
}
