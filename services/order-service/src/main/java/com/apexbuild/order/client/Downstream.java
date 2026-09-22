package com.apexbuild.order.client;

import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import com.apexbuild.web.http.RemoteClients;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class Downstream {

    private final RemoteClients remoteClients;

    public Downstream(RemoteClients remoteClients) {
        this.remoteClients = remoteClients;
    }

    public JsonNode product(UUID productId) {
        return data("inventory", "inventory-service", client -> client.get()
                .uri("/api/catalog/products/{id}", productId)
                .retrieve()
                .body(JsonNode.class));
    }

    public JsonNode quote(List<Map<String, Object>> lines) {
        return data("inventory", "inventory-service", client -> client.post()
                .uri("/api/catalog/builder/quote")
                .body(Map.of("lines", lines))
                .retrieve()
                .body(JsonNode.class));
    }

    public void reserve(UUID orderId, List<Map<String, Object>> lines) {
        data("inventory", "inventory-service", client -> client.post()
                .uri("/api/inventory/reservations")
                .body(Map.of("orderId", orderId, "lines", lines))
                .retrieve()
                .body(JsonNode.class));
    }

    public void release(UUID orderId) {
        data("inventory", "inventory-service", client -> client.post()
                .uri("/api/inventory/reservations/{orderId}/release", orderId)
                .retrieve()
                .body(JsonNode.class));
    }

    public void confirmReservation(UUID orderId) {
        data("inventory", "inventory-service", client -> client.post()
                .uri("/api/inventory/reservations/{orderId}/confirm", orderId)
                .retrieve()
                .body(JsonNode.class));
    }

    public JsonNode address(UUID userId, UUID addressId) {
        return data("user", "user-service", client -> client.get()
                .uri("/api/users/internal/{userId}/addresses/{addressId}", userId, addressId)
                .retrieve()
                .body(JsonNode.class));
    }

    public JsonNode charge(Map<String, Object> body) {
        return data("payment", "payment-service", client -> client.post()
                .uri("/api/payments/charges")
                .body(body)
                .retrieve()
                .body(JsonNode.class));
    }

    private JsonNode data(String breaker, String service, java.util.function.Function<org.springframework.web.client.RestClient, JsonNode> call) {
        JsonNode body = remoteClients.call(breaker, service, call);
        if (body == null || body.get("data") == null || body.get("data").isNull()) {
            if (body != null && body.has("success") && body.get("success").asBoolean()) {
                return body;
            }
            throw new ApexException(ErrorCode.DEPENDENCY_FAILED, service + " returned an empty response");
        }
        return body.get("data");
    }
}
