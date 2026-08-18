package com.apexbuild.web.messaging;

import com.apexbuild.common.messaging.EventEnvelope;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.kafka.core.KafkaTemplate;

import java.time.Instant;
import java.util.UUID;

public class EventPublisher {

    private static final Logger log = LoggerFactory.getLogger(EventPublisher.class);

    private final ObjectProvider<KafkaTemplate<String, String>> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public EventPublisher(ObjectProvider<KafkaTemplate<String, String>> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    public void publish(String topic, String key, Object payload) {
        KafkaTemplate<String, String> template = kafkaTemplate.getIfAvailable();
        if (template == null) {
            log.warn("Kafka is unavailable. Skipped {} key={}", topic, key);
            return;
        }
        try {
            var envelope = new EventEnvelope(UUID.randomUUID(), topic, Instant.now(), MDC.get("traceId"),
                    objectMapper.valueToTree(payload));
            template.send(topic, key, objectMapper.writeValueAsString(envelope));
            log.info("Published {} key={}", topic, key);
        } catch (Exception ex) {
            log.error("Failed to publish {} key={}", topic, key, ex);
        }
    }
}
