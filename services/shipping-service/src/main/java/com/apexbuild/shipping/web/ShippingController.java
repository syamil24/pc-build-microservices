package com.apexbuild.shipping.web;

import com.apexbuild.common.api.ApiResponse;
import com.apexbuild.shipping.service.ShippingService;
import com.apexbuild.shipping.service.ShippingService.ShipmentView;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/shipments")
public class ShippingController {

    private final ShippingService shipping;

    public ShippingController(ShippingService shipping) {
        this.shipping = shipping;
    }

    @GetMapping("/order/{orderId}")
    ResponseEntity<ApiResponse<ShipmentView>> byOrder(@PathVariable UUID orderId) {
        return ResponseEntity.ok(ApiResponse.ok(shipping.byOrder(orderId)));
    }
}
