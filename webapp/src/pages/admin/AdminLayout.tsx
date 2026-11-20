import { NavLink, Outlet } from "react-router-dom";
import { SiteFooter, SiteHeader, SkipLink } from "../../SiteChrome";

export default function AdminLayout() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="content" className="shell" tabIndex={-1}>
        <p className="kicker">Admin</p>
        <h1>Back office</h1>
        <nav className="admin-nav" aria-label="Admin">
          <NavLink to="/admin" end>Products</NavLink>
          <NavLink to="/admin/reports">Sales report</NavLink>
          <NavLink to="/admin/platform">Live ops</NavLink>
          <NavLink to="/">Shop</NavLink>
        </nav>
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}
