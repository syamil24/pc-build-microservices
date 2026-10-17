package com.apexbuild.inventory.web;

import com.apexbuild.common.api.ApiResponse;
import com.apexbuild.common.api.PageResponse;
import com.apexbuild.inventory.service.CatalogService;
import com.apexbuild.inventory.web.CatalogDtos.ProductResponse;
import com.apexbuild.inventory.web.CatalogDtos.ProductWrite;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/catalog/admin/products")
public class AdminProductController {

    private final CatalogService catalog;

    public AdminProductController(CatalogService catalog) {
        this.catalog = catalog;
    }

    @GetMapping
    ResponseEntity<ApiResponse<PageResponse<ProductResponse>>> products(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "true") boolean includeInactive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(catalog.adminSearch(category, q, includeInactive, page, size)));
    }

    @GetMapping("/{id}")
    ResponseEntity<ApiResponse<ProductResponse>> product(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(catalog.adminGet(id)));
    }

    @PostMapping
    ResponseEntity<ApiResponse<ProductResponse>> create(@RequestBody ProductWrite request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(catalog.create(request)));
    }

    @PutMapping("/{id}")
    ResponseEntity<ApiResponse<ProductResponse>> update(@PathVariable UUID id, @RequestBody ProductWrite request) {
        return ResponseEntity.ok(ApiResponse.ok(catalog.update(id, request)));
    }

    @DeleteMapping("/{id}")
    ResponseEntity<ApiResponse<ProductResponse>> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(catalog.deactivate(id)));
    }
}
