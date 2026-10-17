package com.apexbuild.inventory.service;

import com.apexbuild.common.api.PageResponse;
import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import com.apexbuild.inventory.domain.CompatibilityEngine;
import com.apexbuild.inventory.domain.CompatibilityEngine.BuildPart;
import com.apexbuild.inventory.domain.Product;
import com.apexbuild.inventory.domain.ProductRules;
import com.apexbuild.inventory.repo.CategoryRepository;
import com.apexbuild.inventory.repo.ProductRepository;
import com.apexbuild.inventory.web.CatalogDtos.CategoryResponse;
import com.apexbuild.inventory.web.CatalogDtos.LineRequest;
import com.apexbuild.inventory.web.CatalogDtos.ProductResponse;
import com.apexbuild.inventory.web.CatalogDtos.ProductWrite;
import com.apexbuild.inventory.web.CatalogDtos.QuoteLine;
import com.apexbuild.inventory.web.CatalogDtos.QuoteResponse;
import com.apexbuild.web.cache.CacheClient;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CatalogService {

    private final ProductRepository products;
    private final CategoryRepository categories;
    private final CacheClient cache;

    public CatalogService(ProductRepository products, CategoryRepository categories, CacheClient cache) {
        this.products = products;
        this.categories = categories;
        this.cache = cache;
    }

    public List<CategoryResponse> categories() {
        return cache.get("catalog", "categories", new TypeReference<List<CategoryResponse>>() {
        }).orElseGet(this::loadCategories);
    }

    public List<CategoryResponse> loadCategories() {
        List<CategoryResponse> loaded = categories.findAll().stream()
                .map(category -> new CategoryResponse(category.getCode(), category.getName(), category.isBuilderSlot()))
                .sorted(Comparator.comparing(CategoryResponse::code))
                .toList();
        cache.put("catalog", "categories", loaded, 120);
        return loaded;
    }

    public PageResponse<ProductResponse> search(String category, Integer minPrice, Integer maxPrice, String q, int page, int size) {
        String query = q == null ? "" : q.trim();
        String categoryCode = category == null ? "" : category.trim();
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 48);
        List<ProductResponse> all = products.search(categoryCode, minPrice, maxPrice, query).stream()
                .sorted(Comparator.comparing(Product::getName))
                .map(this::toResponse)
                .toList();
        int from = Math.min(safePage * safeSize, all.size());
        int to = Math.min(from + safeSize, all.size());
        return new PageResponse<>(all.subList(from, to), safePage, safeSize, all.size());
    }

    public PageResponse<ProductResponse> adminSearch(String category, String q, boolean includeInactive, int page, int size) {
        String query = q == null ? "" : q.trim();
        String categoryCode = category == null ? "" : category.trim();
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        List<ProductResponse> all = products.adminSearch(categoryCode, query, includeInactive).stream()
                .sorted(Comparator.comparing(Product::getName))
                .map(this::toResponse)
                .toList();
        int from = Math.min(safePage * safeSize, all.size());
        int to = Math.min(from + safeSize, all.size());
        return new PageResponse<>(all.subList(from, to), safePage, safeSize, all.size());
    }

    public ProductResponse adminGet(UUID id) {
        return toResponse(requireAny(id));
    }

    @Transactional
    public ProductResponse create(ProductWrite request) {
        Prepared prepared = prepare(request, true);
        if (products.findBySku(prepared.sku()).isPresent()) {
            throw new ApexException(ErrorCode.CONFLICT, "SKU already exists");
        }
        UUID id = UUID.nameUUIDFromBytes(("apex:" + prepared.sku()).getBytes(StandardCharsets.UTF_8));
        Product product = products.save(Product.create(id, prepared.sku(), prepared.name(), prepared.category(), prepared.brand(),
                prepared.description(), prepared.priceCents(), prepared.stock(), prepared.imageHue(), prepared.specs()));
        if (!prepared.active()) {
            product.deactivate();
        }
        evictCatalog();
        return toResponse(product);
    }

    @Transactional
    public ProductResponse update(UUID id, ProductWrite request) {
        Product product = requireAny(id);
        Prepared prepared = prepare(request, product.isActive());
        products.findBySku(prepared.sku()).filter(existing -> !existing.getId().equals(id)).ifPresent(existing -> {
            throw new ApexException(ErrorCode.CONFLICT, "SKU already exists");
        });
        product.replace(prepared.sku(), prepared.name(), prepared.category(), prepared.brand(), prepared.description(),
                prepared.priceCents(), prepared.stock(), prepared.imageHue(), prepared.specs(), prepared.active());
        evictCatalog();
        return toResponse(product);
    }

    @Transactional
    public ProductResponse deactivate(UUID id) {
        Product product = requireAny(id);
        product.deactivate();
        evictCatalog();
        return toResponse(product);
    }

    public ProductResponse get(UUID id) {
        return cache.get("product", id.toString(), ProductResponse.class).orElseGet(() -> {
            ProductResponse response = toResponse(require(id));
            cache.put("product", id.toString(), response, 60);
            return response;
        });
    }

    public QuoteResponse quote(List<LineRequest> lines) {
        if (lines == null || lines.isEmpty()) {
            throw new ApexException(ErrorCode.VALIDATION_ERROR, "Add at least one part");
        }
        List<QuoteLine> priced = new ArrayList<>();
        List<BuildPart> parts = new ArrayList<>();
        int total = 0;
        for (LineRequest line : lines) {
            if (line.quantity() < 1) {
                throw new ApexException(ErrorCode.VALIDATION_ERROR, "Quantity must be at least 1");
            }
            Product product = require(line.productId());
            int lineTotal = Math.multiplyExact(product.getPriceCents(), line.quantity());
            total = Math.addExact(total, lineTotal);
            priced.add(new QuoteLine(product.getId(), product.getSku(), product.getName(), product.getCategoryCode(),
                    product.getPriceCents(), line.quantity(), lineTotal, product.getImageHue(), product.getSpecs()));
            parts.add(new BuildPart(product.getName(), product.getCategoryCode(), product.getSpecs()));
        }
        var compatibility = CompatibilityEngine.evaluate(parts);
        return new QuoteResponse(priced, total, compatibility.ok(), compatibility.issues(), compatibility.estimatedWatts(),
                compatibility.psuWatts(), compatibility.recommendedPsuWatts());
    }

    public Product require(UUID id) {
        return products.findById(id).filter(Product::isActive)
                .orElseThrow(() -> new ApexException(ErrorCode.NOT_FOUND, "Product not found"));
    }

    public ProductResponse toResponse(Product product) {
        return new ProductResponse(product.getId(), product.getSku(), product.getName(), product.getCategoryCode(),
                product.getBrand(), product.getDescription(), product.getPriceCents(), product.getStock(),
                product.getImageHue(), product.getImageUrl(), product.getSpecs(), product.isActive());
    }

    public Product requireAny(UUID id) {
        return products.findById(id).orElseThrow(() -> new ApexException(ErrorCode.NOT_FOUND, "Product not found"));
    }

    private Prepared prepare(ProductWrite request, boolean activeDefault) {
        int hue = request.imageHue() == null ? 140 : request.imageHue();
        Map<String, Object> specs = request.specs() == null ? Map.of() : request.specs();
        String sku = request.sku() == null ? "" : request.sku().trim();
        String name = request.name() == null ? "" : request.name().trim();
        String category = request.category() == null ? "" : request.category().trim();
        String brand = request.brand() == null ? "" : request.brand().trim();
        String description = request.description() == null ? "" : request.description().trim();
        ProductRules.check(sku, name, category, brand, description, request.priceCents(), request.stock(), hue);
        if (categories.findById(category).isEmpty()) {
            throw new ApexException(ErrorCode.VALIDATION_ERROR, "Unknown category");
        }
        boolean active = request.active() == null ? activeDefault : request.active();
        return new Prepared(sku, name, category, brand, description, request.priceCents(), request.stock(), hue, specs, active);
    }

    private record Prepared(String sku, String name, String category, String brand, String description, int priceCents,
                            int stock, int imageHue, Map<String, Object> specs, boolean active) {
    }

    public void evictCatalog() {
        cache.evictNamespace("catalog");
        cache.evictNamespace("product");
    }
}
