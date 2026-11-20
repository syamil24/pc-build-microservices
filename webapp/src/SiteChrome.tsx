import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { api, clearSession, session } from "./api";
import { keycloakLogoutUrl } from "./keycloak";
import { productTransitionName } from "./transition";
import type { Cart } from "./types";

function titleFor(pathname: string) {
  if (pathname === "/") return "Apex Build";
  if (pathname.startsWith("/shop")) return "Shop · Apex Build";
  if (pathname.startsWith("/product/")) return "Part · Apex Build";
  if (pathname.startsWith("/builder")) return "PC builder · Apex Build";
  if (pathname.startsWith("/cart")) return "Cart · Apex Build";
  if (pathname.startsWith("/checkout")) return "Checkout · Apex Build";
  if (/^\/orders\/.+/.test(pathname)) return "Order · Apex Build";
  if (pathname.startsWith("/orders")) return "Orders · Apex Build";
  if (pathname.startsWith("/login")) return "Log in · Apex Build";
  if (pathname.startsWith("/register")) return "Create an account · Apex Build";
  if (pathname.startsWith("/account")) return "Account · Apex Build";
  if (pathname.startsWith("/pay/")) return "Demo payment · Apex Build";
  if (pathname.startsWith("/auth/")) return "Signing in · Apex Build";
  if (pathname.startsWith("/admin/reports")) return "Sales report · Apex Build";
  if (pathname.startsWith("/admin/platform")) return "Live ops · Apex Build";
  if (pathname.startsWith("/admin/products")) return "Product · Apex Build";
  if (pathname.startsWith("/admin")) return "Products · Apex Build";
  return "Apex Build";
}

export function SiteHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [email, setEmail] = useState(session()?.email ?? null);
  const [role, setRole] = useState(session()?.role ?? null);
  const [count, setCount] = useState(0);
  const [wide, setWide] = useState(false);
  const wideRef = useRef(false);

  useEffect(() => {
    let cancel = false;
    async function refreshCart() {
      if (!session()) {
        if (!cancel) setCount(0);
        return;
      }
      try {
        const cart = await api<Cart>("/api/cart");
        if (!cancel) setCount(cart.lines.reduce((sum, line) => sum + line.quantity, 0));
      } catch {
        if (!cancel) setCount(0);
      }
    }
    const sync = () => {
      const current = session();
      setEmail(current?.email ?? null);
      setRole(current?.role ?? null);
      void refreshCart();
    };
    window.addEventListener("apex-auth", sync);
    window.addEventListener("apex-cart", refreshCart);
    void refreshCart();
    return () => {
      cancel = true;
      window.removeEventListener("apex-auth", sync);
      window.removeEventListener("apex-cart", refreshCart);
    };
  }, []);

  useEffect(() => {
    document.title = titleFor(location.pathname);
    const content = document.getElementById("content");
    if (content && content.dataset.booted === "true") {
      content.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
    if (content) content.dataset.booted = "true";
  }, [location.pathname]);

  useEffect(() => {
    const header = headerRef.current;
    const inner = innerRef.current;
    const menu = menuRef.current;
    const button = buttonRef.current;
    if (!header || !inner || !menu || !button) return;

    const popoverOk = Object.hasOwn(HTMLElement.prototype, "popover");
    let lastWidth = 0;

    const onToggle = () => {
      button.setAttribute("aria-expanded", menu.matches(":popover-open") ? "true" : "false");
    };
    menu.addEventListener("toggle", onToggle);

    const apply = (fits: boolean) => {
      const open = popoverOk && menu.matches(":popover-open");
      header.classList.toggle("is-wide", fits);
      if (wideRef.current !== fits) {
        wideRef.current = fits;
        setWide(fits);
      }
      if (fits) {
        menu.removeAttribute("popover");
        menu.hidden = false;
        button.setAttribute("aria-expanded", "false");
        return;
      }
      if (popoverOk) {
        menu.hidden = false;
        if (!menu.hasAttribute("popover")) menu.setAttribute("popover", "auto");
        if (open) {
          try { menu.showPopover(); } catch { /* already visible */ }
        }
      } else {
        menu.hidden = true;
        button.setAttribute("aria-expanded", "false");
      }
    };

    const measure = () => {
      const width = header.clientWidth;
      const collapsed = !header.classList.contains("is-wide");
      if (collapsed && width <= lastWidth && lastWidth !== 0) {
        lastWidth = width;
        return;
      }
      lastWidth = width;
      const open = popoverOk && menu.matches(":popover-open");
      header.classList.add("is-measuring", "is-wide");
      menu.hidden = false;
      menu.removeAttribute("popover");
      const fits = inner.scrollWidth <= inner.clientWidth + 1;
      header.classList.remove("is-measuring");
      apply(fits);
      if (!fits && open && popoverOk) {
        try { menu.showPopover(); } catch { /* closed during measure */ }
      }
      window.requestAnimationFrame(() => header.classList.remove("is-measuring"));
    };

    const onFallbackClick = () => {
      if (popoverOk || header.classList.contains("is-wide")) return;
      menu.hidden = !menu.hidden;
      button.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
    };
    button.addEventListener("click", onFallbackClick);

    const observer = new ResizeObserver(() => measure());
    observer.observe(header);
    observer.observe(menu);
    measure();
    return () => {
      observer.disconnect();
      menu.removeEventListener("toggle", onToggle);
      button.removeEventListener("click", onFallbackClick);
    };
  }, [email, role, count]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      event.preventDefault();
      event.stopPropagation();

      const menu = document.getElementById("site-menu");
      if (menu instanceof HTMLElement && menu.matches(":popover-open")) menu.hidePopover();

      const destination = url.pathname.match(/^\/product\/([^/]+)$/)?.[1];
      const leaving = window.location.pathname.match(/^\/product\/([^/]+)$/)?.[1];
      if (destination) {
        document.querySelectorAll<HTMLElement>(".product-photo").forEach((node) => {
          node.style.viewTransitionName = "";
        });
        const photo = anchor.querySelector<HTMLElement>(".product-photo");
        if (photo) photo.style.viewTransitionName = productTransitionName(destination);
      }

      const next = `${url.pathname}${url.search}${url.hash}`;
      const update = () => {
        flushSync(() => navigateRef.current(next));
        if (!destination && leaving) {
          const card = document.querySelector<HTMLElement>(`[data-product-id="${CSS.escape(leaving)}"] .product-photo`);
          if (card) card.style.viewTransitionName = productTransitionName(leaving);
        }
        window.scrollTo(0, 0);
      };

      if (!document.startViewTransition || reduced.matches) {
        update();
        return;
      }
      document.startViewTransition(update);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <header className="site-header" ref={headerRef}>
      <div className="header-bar">
        <div className="header-inner" ref={innerRef}>
          <NavLink to="/" end className="brand">APEX<span>BUILD</span></NavLink>
          <nav className="site-nav" aria-label="Primary">
            <button
              ref={buttonRef}
              className="menu-button"
              type="button"
              aria-controls="site-menu"
              aria-expanded="false"
              {...{ popovertarget: "site-menu", popovertargetaction: "toggle" }}
            >
              <span className="menu-glyph" aria-hidden="true" />
              <span>Menu</span>
            </button>
            <ul id="site-menu" className="site-menu" ref={menuRef} {...(wide ? {} : { popover: "auto" as const })}>
              <li><NavLink to="/shop">Shop</NavLink></li>
              <li><NavLink to="/builder">PC Builder</NavLink></li>
              {role === "ADMIN" && <li><NavLink to="/admin">Admin</NavLink></li>}
              <li className="nav-account"><NavLink to="/cart">Cart ({count})</NavLink></li>
              {email ? (
                <>
                  <li><NavLink to="/orders">Orders</NavLink></li>
                  <li><NavLink to="/account">{email}</NavLink></li>
                  <li>
                    <button type="button" className="ghost" onClick={() => { clearSession(); window.location.assign(keycloakLogoutUrl()); }}>
                      Log out
                    </button>
                  </li>
                </>
              ) : (
                <li><NavLink to="/login" className="btn">Log in</NavLink></li>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <p>Apex Build · custom rigs, laptops, and parts · prices in MYR</p>
        <nav aria-label="Footer">
          <NavLink to="/shop">Shop</NavLink>
          <NavLink to="/builder">PC Builder</NavLink>
          <NavLink to="/account">Account</NavLink>
        </nav>
      </div>
    </footer>
  );
}

export function SkipLink() {
  return <a className="skip" href="#content">Skip to content</a>;
}
