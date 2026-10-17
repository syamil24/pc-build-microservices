import { NavLink, Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <section>
      <div className="kicker">Admin</div>
      <h1>Back office</h1>
      <nav className="admin-nav">
        <NavLink to="/admin" end>Products</NavLink>
        <NavLink to="/admin/reports">Sales report</NavLink>
        <NavLink to="/admin/platform">Live ops</NavLink>
        <NavLink to="/">Shop</NavLink>
      </nav>
      <Outlet />
    </section>
  );
}
