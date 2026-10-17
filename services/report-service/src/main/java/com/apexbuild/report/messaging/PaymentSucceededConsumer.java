package com.apexbuild.report.messaging;

import com.apexbuild.common.messaging.KafkaTopics;
import com.apexbuild.report.service.SalesReportService;
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
public class PaymentSucceededConsumer {

    private static final Logger log = LoggerFactory.getLogger(PaymentSucceededConsumer.class);

    private final ObjectMapper objectMapper;
    private final SalesReportService reports;

    public PaymentSucceededConsumer(ObjectMapper objectMapper, SalesReportService reports) {
        this.objectMapper = objectMapper;
        this.reports = reports;
    }

    @KafkaListener(topics = KafkaTopics.PAYMENT_SUCCEEDED)
    public void onPaid(String raw) {
        try {
            JsonNode payload = EventMessages.payload(objectMapper, raw);
            reports.recordPaidOrder(UUID.fromString(payload.get("orderId").asText()));
        } catch (Exception ex) {
            log.error("Could not record a paid order for the sales report", ex);
        } finally {
            MDC.remove("traceId");
        }
    }
}
