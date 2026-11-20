import { Outlet } from "react-router-dom";
import { SiteFooter, SiteHeader, SkipLink } from "./SiteChrome";

export default function Layout() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="content" className="shell" tabIndex={-1}>
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}
