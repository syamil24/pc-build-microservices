package com.apexbuild.inventory.web;

import com.apexbuild.common.api.ApiResponse;
import com.apexbuild.inventory.service.ReservationService;
import com.apexbuild.inventory.web.CatalogDtos.ReserveRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/inventory/reservations")
public class ReservationController {

    private final ReservationService reservations;

    public ReservationController(ReservationService reservations) {
        this.reservations = reservations;
    }

    @PostMapping
    ResponseEntity<ApiResponse<Void>> reserve(@RequestBody ReserveRequest request) {
        reservations.reserve(request.orderId(), request.lines());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/{orderId}/confirm")
    ResponseEntity<ApiResponse<Void>> confirm(@PathVariable UUID orderId) {
        reservations.confirm(orderId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/{orderId}/release")
    ResponseEntity<ApiResponse<Void>> release(@PathVariable UUID orderId) {
        reservations.release(orderId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
