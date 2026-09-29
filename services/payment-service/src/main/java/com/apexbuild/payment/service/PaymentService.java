package com.apexbuild.payment.service;

import com.apexbuild.common.config.ApexProperties;
import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import com.apexbuild.common.messaging.KafkaTopics;
import com.apexbuild.payment.chip.ChipClient;
import com.apexbuild.payment.chip.ChipSignatures;
import com.apexbuild.payment.config.ChipProperties;
import com.apexbuild.payment.domain.Payment;
import com.apexbuild.payment.repo.PaymentRepository;
import com.apexbuild.web.messaging.EventPublisher;
import com.apexbuild.web.security.CurrentUser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository payments;
    private final ChipProperties chip;
    private final ChipClient chipClient;
    private final EventPublisher events;
    private final ObjectMapper objectMapper;
    private final ApexProperties apex;

    public PaymentService(PaymentRepository payments, ChipProperties chip, ChipClient chipClient, EventPublisher events,
                          ObjectMapper objectMapper, ApexProperties apex) {
        this.payments = payments;
        this.chip = chip;
        this.chipClient = chipClient;
        this.events = events;
        this.objectMapper = objectMapper;
        this.apex = apex;
    }

    @Transactional
    public PaymentView charge(ChargeRequest request) {
        Payment existing = payments.findByOrderId(request.orderId()).orElse(null);
        if (existing != null) {
            return view(existing);
        }
        Payment payment;
        if (chip.live()) {
            var created = chipClient.create(request.email(), request.orderId().toString(), request.amountCents(),
                    request.lines().stream().map(line -> new ChipClient.ProductLine(line.name(), line.unitPriceCents(), line.quantity())).toList());
            payment = Payment.start(request.orderId(), request.userId(), request.amountCents(), "CHIP", created.checkoutUrl());
            payment.setProviderRef(created.id());
        } else {
            payment = Payment.start(request.orderId(), request.userId(), request.amountCents(), "DEMO", "pending");
            payments.save(payment);
            payment.setCheckoutUrl(chip.getWebappOrigin() + "/pay/demo/" + payment.getId());
        }
        return view(payments.save(payment));
    }

    @Transactional
    public PaymentView demoConfirm(UUID paymentId, boolean success) {
        if (chip.live()) {
            throw new ApexException(ErrorCode.FORBIDDEN, "Demo confirmation is disabled in live CHIP mode");
        }
        Payment payment = requireOwned(paymentId);
        if ("PAID".equals(payment.getStatus())) {
            return view(payment);
        }
        if (success) {
            markPaid(payment, "demo-" + payment.getId());
        } else {
            markFailed(payment, "Customer cancelled the demo payment");
        }
        return view(payment);
    }

    @Transactional
    public void acceptChipCallback(byte[] raw, String signature) {
        if (!ChipSignatures.verify(raw, signature, chip.getPublicKey())) {
            throw new ApexException(ErrorCode.UNAUTHORIZED, "CHIP signature is invalid");
        }
        try {
            JsonNode body = objectMapper.readTree(raw);
            String purchaseId = text(body, "id");
            String reference = text(body, "reference");
            String status = text(body, "status");
            Payment payment = payments.findByProviderRef(purchaseId)
                    .or(() -> reference == null ? java.util.Optional.empty() : payments.findByOrderId(UUID.fromString(reference)))
                    .orElseThrow(() -> new ApexException(ErrorCode.NOT_FOUND, "Payment not found for CHIP callback"));
            if ("PAID".equals(payment.getStatus())) {
                return;
            }
            int reported = body.path("purchase").path("total").asInt(payment.getAmountCents());
            if ("paid".equalsIgnoreCase(status) && reported == payment.getAmountCents()) {
                markPaid(payment, purchaseId);
            } else if ("paid".equalsIgnoreCase(status)) {
                log.error("CHIP amount {} did not match payment {}", reported, payment.getAmountCents());
                markFailed(payment, "CHIP amount did not match the order");
            } else if (List.of("payment_failure", "cancelled", "expired", "error").contains(status)) {
                markFailed(payment, "CHIP status " + status);
            }
        } catch (ApexException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApexException(ErrorCode.VALIDATION_ERROR, "CHIP payload could not be read");
        }
    }

    public PaymentView get(UUID paymentId) {
        return view(requireOwned(paymentId));
    }

    private Payment requireOwned(UUID paymentId) {
        Payment payment = payments.findById(paymentId)
                .orElseThrow(() -> new ApexException(ErrorCode.NOT_FOUND, "Payment not found"));
        if (!payment.getUserId().equals(CurrentUser.id())) {
            throw new ApexException(ErrorCode.FORBIDDEN, "Payment belongs to another customer");
        }
        return payment;
    }

    private void markPaid(Payment payment, String providerRef) {
        payment.setStatus("PAID");
        if (providerRef != null) {
            payment.setProviderRef(providerRef);
        }
        events.publish(KafkaTopics.PAYMENT_SUCCEEDED, payment.getOrderId().toString(), Map.of(
                "paymentId", payment.getId().toString(),
                "orderId", payment.getOrderId().toString(),
                "userId", payment.getUserId().toString(),
                "amountCents", payment.getAmountCents(),
                "providerRef", payment.getProviderRef() == null ? "" : payment.getProviderRef()));
    }

    private void markFailed(Payment payment, String reason) {
        payment.setStatus("FAILED");
        events.publish(KafkaTopics.PAYMENT_FAILED, payment.getOrderId().toString(), Map.of(
                "paymentId", payment.getId().toString(),
                "orderId", payment.getOrderId().toString(),
                "reason", reason));
    }

    private PaymentView view(Payment payment) {
        return new PaymentView(payment.getId(), payment.getOrderId(), payment.getStatus(), payment.getCheckoutUrl(),
                payment.getProvider(), apex.getInstanceId(), payment.getAmountCents());
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    public record ChargeLine(String name, int unitPriceCents, int quantity) {
    }

    public record ChargeRequest(UUID orderId, UUID userId, String email, int amountCents, List<ChargeLine> lines) {
    }

    public record PaymentView(UUID paymentId, UUID orderId, String status, String checkoutUrl, String provider,
                              String instanceId, int amountCents) {
    }
}
