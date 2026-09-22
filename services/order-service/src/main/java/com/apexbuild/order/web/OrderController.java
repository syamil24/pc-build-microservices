package com.apexbuild.order.web;

import com.apexbuild.common.api.ApiResponse;
import com.apexbuild.order.service.CartService;
import com.apexbuild.order.service.CheckoutService;
import com.apexbuild.order.web.OrderDtos.AddItemRequest;
import com.apexbuild.order.web.OrderDtos.BatchRequest;
import com.apexbuild.order.web.OrderDtos.CartResponse;
import com.apexbuild.order.web.OrderDtos.CheckoutRequest;
import com.apexbuild.order.web.OrderDtos.OrderResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class OrderController {

    private final CartService carts;
    private final CheckoutService checkout;

    public OrderController(CartService carts, CheckoutService checkout) {
        this.carts = carts;
        this.checkout = checkout;
    }

    @GetMapping("/api/cart")
    ResponseEntity<ApiResponse<CartResponse>> cart() {
        return ResponseEntity.ok(ApiResponse.ok(carts.get()));
    }

    @PostMapping("/api/cart/items")
    ResponseEntity<ApiResponse<CartResponse>> add(@RequestBody AddItemRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(carts.add(request)));
    }

    @PostMapping("/api/cart/builds")
    ResponseEntity<ApiResponse<CartResponse>> addBuild(@RequestBody BatchRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(carts.addBatch(request.buildId(), request.lines())));
    }

    @DeleteMapping("/api/cart/items/{id}")
    ResponseEntity<ApiResponse<CartResponse>> remove(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(carts.remove(id)));
    }

    @PostMapping("/api/orders/checkout")
    ResponseEntity<ApiResponse<OrderResponse>> checkout(@RequestBody CheckoutRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(checkout.checkout(request.addressId())));
    }

    @GetMapping("/api/orders")
    ResponseEntity<ApiResponse<List<OrderResponse>>> orders() {
        return ResponseEntity.ok(ApiResponse.ok(checkout.mine()));
    }

    @GetMapping("/api/orders/{id}")
    ResponseEntity<ApiResponse<OrderResponse>> order(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(checkout.get(id)));
    }
}
