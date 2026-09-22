package com.apexbuild.order.web;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class OrderDtos {

    private OrderDtos() {
    }

    public record AddItemRequest(UUID productId, int quantity, UUID buildId) {
    }

    public record BatchRequest(UUID buildId, List<AddItemRequest> lines) {
    }

    public record CartLine(UUID id, UUID productId, String name, int unitPriceCents, int quantity, UUID buildId, int lineTotalCents) {
    }

    public record CartResponse(UUID id, List<CartLine> lines, int totalCents) {
    }

    public record CheckoutRequest(UUID addressId) {
    }

    public record OrderLineResponse(UUID productId, String name, int unitPriceCents, int quantity, int lineTotalCents, UUID buildId) {
    }

    public record OrderResponse(UUID id, String status, String currency, int totalCents, String address, String checkoutUrl,
                                UUID paymentId, Instant createdAt, List<OrderLineResponse> lines) {
    }
}
