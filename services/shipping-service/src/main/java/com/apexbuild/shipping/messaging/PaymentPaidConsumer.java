package com.apexbuild.shipping.messaging;

import com.apexbuild.common.messaging.KafkaTopics;
import com.apexbuild.shipping.service.ShippingService;
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
public class PaymentPaidConsumer {

    private static final Logger log = LoggerFactory.getLogger(PaymentPaidConsumer.class);

    private final ObjectMapper objectMapper;
    private final ShippingService shipping;

    public PaymentPaidConsumer(ObjectMapper objectMapper, ShippingService shipping) {
        this.objectMapper = objectMapper;
        this.shipping = shipping;
    }

    @KafkaListener(topics = KafkaTopics.PAYMENT_SUCCEEDED)
    public void onPaid(String raw) {
        try {
            JsonNode payload = EventMessages.payload(objectMapper, raw);
            UUID orderId = UUID.fromString(payload.get("orderId").asText());
            UUID userId = payload.hasNonNull("userId")
                    ? UUID.fromString(payload.get("userId").asText())
                    : orderId;
            shipping.open(orderId, userId);
        } catch (Exception ex) {
            log.error("Could not open shipment", ex);
        } finally {
            MDC.remove("traceId");
        }
    }
}
