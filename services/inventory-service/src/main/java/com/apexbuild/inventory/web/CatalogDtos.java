package com.apexbuild.inventory.web;

import com.apexbuild.inventory.domain.CompatibilityEngine.Issue;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class CatalogDtos {

    private CatalogDtos() {
    }

    public record CategoryResponse(String code, String name, boolean builderSlot) {
    }

    public record ProductResponse(UUID id, String sku, String name, String category, String brand, String description,
                                  int priceCents, int stock, int imageHue, String imageUrl, Map<String, Object> specs, boolean active) {
    }

    public record ProductWrite(String sku, String name, String category, String brand, String description,
                               int priceCents, int stock, Integer imageHue, Map<String, Object> specs, Boolean active) {
    }

    public record LineRequest(UUID productId, int quantity) {
    }

    public record QuoteRequest(List<LineRequest> lines) {
    }

    public record QuoteLine(UUID productId, String sku, String name, String category, int unitPriceCents, int quantity,
                            int lineTotalCents, int imageHue, Map<String, Object> specs) {
    }

    public record QuoteResponse(List<QuoteLine> lines, int totalCents, boolean ok, List<Issue> issues,
                                int estimatedWatts, Integer psuWatts, int recommendedPsuWatts) {
    }

    public record ReserveRequest(UUID orderId, List<LineRequest> lines) {
    }
}
