package com.apexbuild.payment.web;

import com.apexbuild.common.api.ApiResponse;
import com.apexbuild.payment.service.PaymentService;
import com.apexbuild.payment.service.PaymentService.ChargeRequest;
import com.apexbuild.payment.service.PaymentService.PaymentView;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService payments;

    public PaymentController(PaymentService payments) {
        this.payments = payments;
    }

    @PostMapping("/charges")
    ResponseEntity<ApiResponse<PaymentView>> charge(@RequestBody ChargeRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(payments.charge(request)));
    }

    @GetMapping("/{id}")
    ResponseEntity<ApiResponse<PaymentView>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(payments.get(id)));
    }

    @PostMapping("/demo/{id}/confirm")
    ResponseEntity<ApiResponse<PaymentView>> confirm(@PathVariable UUID id, @RequestBody Map<String, Boolean> body) {
        boolean success = body.getOrDefault("success", true);
        return ResponseEntity.ok(ApiResponse.ok(payments.demoConfirm(id, success)));
    }

    @PostMapping("/chip/callback")
    ResponseEntity<Void> callback(HttpServletRequest request) throws Exception {
        byte[] raw = request.getInputStream().readAllBytes();
        payments.acceptChipCallback(raw, request.getHeader("X-Signature"));
        return ResponseEntity.ok().build();
    }
}
