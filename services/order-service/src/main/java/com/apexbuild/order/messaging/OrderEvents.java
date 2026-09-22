package com.apexbuild.order.messaging;

import com.apexbuild.common.messaging.KafkaTopics;
import com.apexbuild.order.service.CheckoutService;
import com.apexbuild.web.messaging.EventMessages;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class OrderEvents {

    private static final Logger log = LoggerFactory.getLogger(OrderEvents.class);

    private final ObjectMapper objectMapper;
    private final CheckoutService checkout;

    public OrderEvents(ObjectMapper objectMapper, CheckoutService checkout) {
        this.objectMapper = objectMapper;
        this.checkout = checkout;
    }

    @KafkaListener(topics = KafkaTopics.PAYMENT_SUCCEEDED)
    public void paid(String raw) {
        apply(raw, true);
    }

    @KafkaListener(topics = KafkaTopics.PAYMENT_FAILED)
    public void failed(String raw) {
        apply(raw, false);
    }

    @KafkaListener(topics = KafkaTopics.SHIPPING_UPDATED)
    public void shipped(String raw) {
        try {
            JsonNode payload = EventMessages.payload(objectMapper, raw);
            if ("DELIVERED".equals(payload.get("status").asText())) {
                checkout.markFulfilled(UUID.fromString(payload.get("orderId").asText()));
            }
        } catch (Exception ex) {
            log.error("Could not apply shipping update", ex);
        } finally {
            MDC.remove("traceId");
        }
    }

    private void apply(String raw, boolean success) {
        try {
            JsonNode payload = EventMessages.payload(objectMapper, raw);
            UUID orderId = UUID.fromString(payload.get("orderId").asText());
            if (success) {
                checkout.markPaid(orderId);
            } else {
                checkout.markFailed(orderId);
            }
        } catch (Exception ex) {
            log.error("Could not apply payment event", ex);
        } finally {
            MDC.remove("traceId");
        }
    }
}
