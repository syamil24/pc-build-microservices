package com.apexbuild.user.messaging;

import com.apexbuild.common.messaging.KafkaTopics;
import com.apexbuild.user.service.ProfileService;
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
public class UserRegisteredConsumer {

    private static final Logger log = LoggerFactory.getLogger(UserRegisteredConsumer.class);

    private final ObjectMapper objectMapper;
    private final ProfileService profileService;

    public UserRegisteredConsumer(ObjectMapper objectMapper, ProfileService profileService) {
        this.objectMapper = objectMapper;
        this.profileService = profileService;
    }

    @KafkaListener(topics = KafkaTopics.USER_REGISTERED)
    public void onRegistered(String raw) {
        try {
            JsonNode payload = EventMessages.payload(objectMapper, raw);
            profileService.upsert(UUID.fromString(payload.get("authUserId").asText()),
                    payload.get("email").asText(), payload.get("fullName").asText());
            log.info("Profile ensured for {}", payload.get("email").asText());
        } catch (Exception ex) {
            log.error("Could not apply user.registered", ex);
        } finally {
            MDC.remove("traceId");
        }
    }
}
