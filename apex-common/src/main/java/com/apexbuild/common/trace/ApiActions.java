package com.apexbuild.common.trace;

/**
 * One-line API log shared by the gateway and every service.
 * The line names the shopper and the action. It never includes a query string, body, or token.
 */
public final class ApiActions {

    private ApiActions() {
    }

    public static String line(String service, String userId, String role, String method, String path, int status, long millis) {
        return service + " user=" + shown(userId) + " role=" + shown(role)
                + " action=\"" + describe(method, path) + "\" "
                + method + " " + pathOnly(path) + " -> " + status + " in " + millis + "ms";
    }

    /** Arrival line. The trace id is the one already on the logging thread. */
    public static String received(String service, String userId, String role, String method, String path) {
        return service + " received user=" + shown(userId) + " role=" + shown(role)
                + " " + method + " " + pathOnly(path);
    }

    public static String describe(String method, String path) {
        String p = pathOnly(path);
        String m = method == null ? "" : method;
        if (p.equals("/api/auth/register") && m.equals("POST")) {
            return "Register";
        }
        if (p.equals("/api/auth/login") && m.equals("POST")) {
            return "Log in";
        }
        if (p.equals("/api/auth/refresh") && m.equals("POST")) {
            return "Refresh session";
        }
        if (p.equals("/api/auth/me")) {
            return "Read own account";
        }
        if (p.equals("/api/catalog/categories")) {
            return "List categories";
        }
        if (p.equals("/api/catalog/products")) {
            return "Search products";
        }
        if (p.startsWith("/api/catalog/products/")) {
            return "View product";
        }
        if (p.equals("/api/catalog/builder/quote")) {
            return "Quote a build";
        }
        if (p.equals("/api/catalog/admin") && m.equals("GET")) {
            return "List products";
        }
        if (p.equals("/api/catalog/admin") && m.equals("POST")) {
            return "Create product";
        }
        if (p.startsWith("/api/catalog/admin/") && m.equals("GET")) {
            return "View product";
        }
        if (p.startsWith("/api/catalog/admin/") && m.equals("PUT")) {
            return "Update product";
        }
        if (p.startsWith("/api/catalog/admin/") && m.equals("DELETE")) {
            return "Deactivate product";
        }
        if (p.equals("/api/cart")) {
            return "View cart";
        }
        if (p.equals("/api/cart/items") && m.equals("POST")) {
            return "Add part to cart";
        }
        if (p.equals("/api/cart/builds") && m.equals("POST")) {
            return "Add build to cart";
        }
        if (p.startsWith("/api/cart/items/") && m.equals("DELETE")) {
            return "Remove cart line";
        }
        if (p.equals("/api/orders/checkout")) {
            return "Check out";
        }
        if (p.equals("/api/orders")) {
            return "List orders";
        }
        if (p.startsWith("/api/orders/internal/")) {
            return "Read order";
        }
        if (p.startsWith("/api/orders/")) {
            return "View order";
        }
        if (p.equals("/api/payments/charges")) {
            return "Start payment";
        }
        if (p.startsWith("/api/payments/demo/") && p.endsWith("/confirm")) {
            return "Confirm demo payment";
        }
        if (p.equals("/api/payments/chip/callback")) {
            return "Receive CHIP callback";
        }
        if (p.startsWith("/api/payments/")) {
            return "View payment";
        }
        if (p.startsWith("/api/shipments/")) {
            return "View shipment";
        }
        if (p.equals("/api/users/me") && m.equals("GET")) {
            return "Read profile";
        }
        if (p.equals("/api/users/me") && m.equals("PUT")) {
            return "Update profile";
        }
        if (p.equals("/api/users/me/addresses") && m.equals("GET")) {
            return "List addresses";
        }
        if (p.equals("/api/users/me/addresses") && m.equals("POST")) {
            return "Add address";
        }
        if (p.startsWith("/api/users/me/addresses/") && m.equals("DELETE")) {
            return "Delete address";
        }
        if (p.equals("/api/users/internal/profiles")) {
            return "Create profile";
        }
        if (p.startsWith("/api/users/internal/")) {
            return "Read address";
        }
        if (p.equals("/api/reports/sales.pdf")) {
            return "Download sales report";
        }
        if (p.startsWith("/api/reports/")) {
            return "View sales report";
        }
        if (p.startsWith("/api/platform/")) {
            return "View live ops";
        }
        if (p.equals("/api/inventory/reservations") && m.equals("POST")) {
            return "Reserve stock";
        }
        if (p.startsWith("/api/inventory/reservations/") && p.endsWith("/confirm")) {
            return "Confirm reservation";
        }
        if (p.startsWith("/api/inventory/reservations/") && p.endsWith("/release")) {
            return "Release reservation";
        }
        if (p.startsWith("/api/cache/") && m.equals("GET")) {
            return "Read cache";
        }
        if (p.startsWith("/api/cache/") && m.equals("PUT")) {
            return "Write cache";
        }
        if (p.startsWith("/api/cache/") && m.equals("DELETE")) {
            return "Delete cache";
        }
        return m + " " + p;
    }

    private static String pathOnly(String path) {
        if (path == null || path.isBlank()) {
            return "/";
        }
        int query = path.indexOf('?');
        return query < 0 ? path : path.substring(0, query);
    }

    private static String shown(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}
