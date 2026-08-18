package com.apexbuild.web.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.MDC;

public final class EventMessages {

    private EventMessages() {
    }

    public static JsonNode payload(ObjectMapper objectMapper, String raw) throws Exception {
        JsonNode root = objectMapper.readTree(raw);
        JsonNode trace = root.get("traceId");
        if (trace != null && !trace.isNull()) {
            MDC.put("traceId", trace.asText());
        }
        return root.get("payload");
    }
}
