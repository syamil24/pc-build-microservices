package com.apexbuild.order.web;

import com.apexbuild.common.api.ApiResponse;
import com.apexbuild.order.service.CheckoutService;
import com.apexbuild.order.web.OrderDtos.InternalOrder;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/orders/internal")
public class InternalOrderController {

    private final CheckoutService checkout;

    public InternalOrderController(CheckoutService checkout) {
        this.checkout = checkout;
    }

    @GetMapping("/{id}")
    ResponseEntity<ApiResponse<InternalOrder>> order(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(checkout.internal(id)));
    }
}
