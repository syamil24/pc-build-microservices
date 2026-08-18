package com.apexbuild.web.cache;

import com.apexbuild.web.http.RemoteClients;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.Optional;

public class CacheClient {

    private static final Logger log = LoggerFactory.getLogger(CacheClient.class);

    private final RemoteClients remoteClients;
    private final ObjectMapper objectMapper;

    public CacheClient(RemoteClients remoteClients, ObjectMapper objectMapper) {
        this.remoteClients = remoteClients;
        this.objectMapper = objectMapper;
    }

    public <T> Optional<T> get(String namespace, String key, Class<T> type) {
        return read(namespace, key).map(value -> objectMapper.convertValue(value, type));
    }

    public <T> Optional<T> get(String namespace, String key, TypeReference<T> type) {
        return read(namespace, key).map(value -> objectMapper.convertValue(value, type));
    }

    private Optional<JsonNode> read(String namespace, String key) {
        try {
            JsonNode body = remoteClients.call("cache", "cache-service", client -> client.get()
                    .uri("/api/cache/{namespace}/{key}", namespace, key)
                    .retrieve()
                    .body(JsonNode.class));
            if (body == null || body.get("data") == null || body.get("data").isNull()) {
                return Optional.empty();
            }
            JsonNode value = body.get("data").get("value");
            if (value == null || value.isNull()) {
                return Optional.empty();
            }
            return Optional.of(value);
        } catch (RuntimeException ex) {
            log.warn("Cache get failed for {}:{} ({})", namespace, key, ex.getMessage());
            return Optional.empty();
        }
    }

    public void put(String namespace, String key, Object value, int ttlSeconds) {
        try {
            remoteClients.call("cache", "cache-service", client -> client.put()
                    .uri("/api/cache/{namespace}/{key}", namespace, key)
                    .body(Map.of("value", value, "ttlSeconds", ttlSeconds))
                    .retrieve()
                    .toBodilessEntity());
        } catch (RuntimeException ex) {
            log.warn("Cache put failed for {}:{} ({})", namespace, key, ex.getMessage());
        }
    }

    public void evictNamespace(String namespace) {
        try {
            remoteClients.call("cache", "cache-service", client -> client.delete()
                    .uri("/api/cache/{namespace}", namespace)
                    .retrieve()
                    .toBodilessEntity());
        } catch (RuntimeException ex) {
            log.warn("Cache evict failed for {} ({})", namespace, ex.getMessage());
        }
    }
}
