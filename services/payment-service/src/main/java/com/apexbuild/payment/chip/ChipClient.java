package com.apexbuild.payment.chip;

import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import com.apexbuild.payment.config.ChipProperties;
import com.apexbuild.web.http.ProtectedCall;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

@Component
public class ChipClient {

    private final ChipProperties properties;
    private final ProtectedCall protectedCall;
    private final ObjectMapper objectMapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public ChipClient(ChipProperties properties, ProtectedCall protectedCall, ObjectMapper objectMapper) {
        this.properties = properties;
        this.protectedCall = protectedCall;
        this.objectMapper = objectMapper;
    }

    public CreatedPurchase create(String email, String orderId, int amountCents, List<ProductLine> lines) {
        if (properties.getSecretKey().isBlank() || properties.getBrandId().isBlank()) {
            throw new ApexException(ErrorCode.DEPENDENCY_FAILED, "CHIP_SECRET_KEY and CHIP_BRAND_ID are required in live mode");
        }
        return protectedCall.run("chip", () -> {
            try {
                ObjectNode root = objectMapper.createObjectNode();
                ObjectNode client = root.putObject("client");
                client.put("email", email);
                ObjectNode purchase = root.putObject("purchase");
                purchase.put("currency", "MYR");
                purchase.put("notes", "Apex Build order " + orderId);
                ArrayNode products = purchase.putArray("products");
                for (ProductLine line : lines) {
                    ObjectNode product = products.addObject();
                    product.put("name", line.name());
                    product.put("price", line.unitPriceCents());
                    product.put("quantity", line.quantity());
                }
                root.put("brand_id", properties.getBrandId());
                root.put("reference", orderId);
                root.put("success_redirect", properties.getSuccessRedirect());
                root.put("failure_redirect", properties.getFailureRedirect());
                if (properties.getSuccessCallback() != null && !properties.getSuccessCallback().isBlank()) {
                    root.put("success_callback", properties.getSuccessCallback());
                }
                String base = properties.getApiBase().endsWith("/") ? properties.getApiBase() : properties.getApiBase() + "/";
                HttpRequest request = HttpRequest.newBuilder(URI.create(base + "purchases/"))
                        .timeout(Duration.ofSeconds(15))
                        .header("Authorization", "Bearer " + properties.getSecretKey())
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(root)))
                        .build();
                HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() >= 400) {
                    throw new ApexException(ErrorCode.DEPENDENCY_FAILED, "CHIP rejected the purchase (" + response.statusCode() + ")");
                }
                JsonNode body = objectMapper.readTree(response.body());
                return new CreatedPurchase(body.get("id").asText(), body.get("checkout_url").asText(), body.get("status").asText());
            } catch (ApexException ex) {
                throw ex;
            } catch (Exception ex) {
                throw new ApexException(ErrorCode.DEPENDENCY_FAILED, "CHIP purchase failed: " + ex.getMessage());
            }
        });
    }

    public record ProductLine(String name, int unitPriceCents, int quantity) {
    }

    public record CreatedPurchase(String id, String checkoutUrl, String status) {
    }
}
