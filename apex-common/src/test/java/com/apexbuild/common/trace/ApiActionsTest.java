package com.apexbuild.common.trace;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class ApiActionsTest {

    @Test
    void namesTheShopperAction() {
        String line = ApiActions.line("order-service", "60351af1-b7c2-4f1a-9c0e-1a2b3c4d5e6f", "CUSTOMER",
                "POST", "/api/cart/builds?ignored=1", 201, 18);

        assertEquals("order-service user=60351af1-b7c2-4f1a-9c0e-1a2b3c4d5e6f role=CUSTOMER "
                + "action=\"Add build to cart\" POST /api/cart/builds -> 201 in 18ms", line);
        assertFalse(line.contains("ignored"));
    }

    @Test
    void namesCheckoutPaymentAndAdminEdits() {
        assertEquals("Check out", ApiActions.describe("POST", "/api/orders/checkout"));
        assertEquals("Start payment", ApiActions.describe("POST", "/api/payments/charges"));
        assertEquals("Update product", ApiActions.describe("PUT", "/api/catalog/admin/abc"));
        assertEquals("View product", ApiActions.describe("GET", "/api/catalog/products/abc"));
    }

    @Test
    void namesTheArrivalWithoutTheQuery() {
        String line = ApiActions.received("gateway-service", null, null, "GET", "/api/catalog/products?q=gpu");
        assertEquals("gateway-service received user=- role=- GET /api/catalog/products", line);
        assertFalse(line.contains("q="));
    }

    @Test
    void leavesAnonymousCallsBlank() {
        String line = ApiActions.line("gateway-service", null, " ", "GET", "/api/catalog/products", 200, 4);
        assertEquals("gateway-service user=- role=- action=\"Search products\" GET /api/catalog/products -> 200 in 4ms", line);
    }
}
