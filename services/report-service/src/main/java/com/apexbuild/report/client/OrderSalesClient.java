package com.apexbuild.report.client;

import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import com.apexbuild.web.http.RemoteClients;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class OrderSalesClient {

    private final RemoteClients remoteClients;

    public OrderSalesClient(RemoteClients remoteClients) {
        this.remoteClients = remoteClients;
    }

    public JsonNode order(UUID orderId) {
        JsonNode body = remoteClients.call("order", "order-service", client -> client.get()
                .uri("/api/orders/internal/{id}", orderId)
                .retrieve()
                .body(JsonNode.class));
        if (body == null || body.get("data") == null || body.get("data").isNull()) {
            throw new ApexException(ErrorCode.DEPENDENCY_FAILED, "order-service returned an empty response");
        }
        return body.get("data");
    }
}
