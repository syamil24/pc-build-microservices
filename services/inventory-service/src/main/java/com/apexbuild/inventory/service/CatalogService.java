package com.apexbuild.inventory.service;

import com.apexbuild.common.api.PageResponse;
import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import com.apexbuild.inventory.domain.CompatibilityEngine;
import com.apexbuild.inventory.domain.CompatibilityEngine.BuildPart;
import com.apexbuild.inventory.domain.Product;
import com.apexbuild.inventory.repo.CategoryRepository;
import com.apexbuild.inventory.repo.ProductRepository;
import com.apexbuild.inventory.web.CatalogDtos.CategoryResponse;
import com.apexbuild.inventory.web.CatalogDtos.LineRequest;
import com.apexbuild.inventory.web.CatalogDtos.ProductResponse;
import com.apexbuild.inventory.web.CatalogDtos.QuoteLine;
import com.apexbuild.inventory.web.CatalogDtos.QuoteResponse;
import com.apexbuild.web.cache.CacheClient;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
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
        String query = q == null || q.isBlank() ? null : q.trim();
        String categoryCode = category == null || category.isBlank() ? null : category.trim();
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
                product.getImageHue(), product.getSpecs());
    }

    public void evictCatalog() {
        cache.evictNamespace("catalog");
        cache.evictNamespace("product");
    }
}
