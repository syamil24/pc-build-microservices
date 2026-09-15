package com.apexbuild.inventory.web;

import com.apexbuild.common.api.ApiResponse;
import com.apexbuild.common.api.PageResponse;
import com.apexbuild.inventory.service.CatalogService;
import com.apexbuild.inventory.web.CatalogDtos.CategoryResponse;
import com.apexbuild.inventory.web.CatalogDtos.ProductResponse;
import com.apexbuild.inventory.web.CatalogDtos.QuoteRequest;
import com.apexbuild.inventory.web.CatalogDtos.QuoteResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/catalog")
public class CatalogController {

    private final CatalogService catalog;

    public CatalogController(CatalogService catalog) {
        this.catalog = catalog;
    }

    @GetMapping("/categories")
    ResponseEntity<ApiResponse<List<CategoryResponse>>> categories() {
        return ResponseEntity.ok(ApiResponse.ok(catalog.categories()));
    }

    @GetMapping("/products")
    ResponseEntity<ApiResponse<PageResponse<ProductResponse>>> products(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Integer minPrice,
            @RequestParam(required = false) Integer maxPrice,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return ResponseEntity.ok(ApiResponse.ok(catalog.search(category, minPrice, maxPrice, q, page, size)));
    }

    @GetMapping("/products/{id}")
    ResponseEntity<ApiResponse<ProductResponse>> product(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(catalog.get(id)));
    }

    @PostMapping("/builder/quote")
    ResponseEntity<ApiResponse<QuoteResponse>> quote(@RequestBody QuoteRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(catalog.quote(request.lines())));
    }
}
