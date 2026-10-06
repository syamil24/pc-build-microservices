package com.apexbuild.cache.web;

import com.apexbuild.common.api.ApiResponse;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.Set;

@RestController
@RequestMapping("/api/cache")
public class CacheController {

    private final StringRedisTemplate redis;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public CacheController(StringRedisTemplate redis, com.fasterxml.jackson.databind.ObjectMapper objectMapper) {
        this.redis = redis;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/{namespace}/{key}")
    ResponseEntity<ApiResponse<CacheHit>> get(@PathVariable String namespace, @PathVariable String key) throws Exception {
        String raw = redis.opsForValue().get(redisKey(namespace, key));
        if (raw == null) {
            return ResponseEntity.ok(ApiResponse.ok(null));
        }
        JsonNode value = objectMapper.readTree(raw).get("value");
        return ResponseEntity.ok(ApiResponse.ok(new CacheHit(namespace, key, value)));
    }

    @PutMapping("/{namespace}/{key}")
    ResponseEntity<ApiResponse<Void>> put(@PathVariable String namespace, @PathVariable String key, @RequestBody PutRequest request)
            throws Exception {
        String payload = objectMapper.writeValueAsString(java.util.Map.of("value", request.value()));
        int ttl = request.ttlSeconds() <= 0 ? 60 : request.ttlSeconds();
        redis.opsForValue().set(redisKey(namespace, key), payload, Duration.ofSeconds(ttl));
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @DeleteMapping("/{namespace}/{key}")
    ResponseEntity<ApiResponse<Void>> delete(@PathVariable String namespace, @PathVariable String key) {
        redis.delete(redisKey(namespace, key));
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @DeleteMapping("/{namespace}")
    ResponseEntity<ApiResponse<Void>> deleteNamespace(@PathVariable String namespace) {
        Set<String> keys = redis.keys(redisKey(namespace, "*"));
        if (keys != null && !keys.isEmpty()) {
            redis.delete(keys);
        }
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    private String redisKey(String namespace, String key) {
        return "apex:" + namespace + ":" + key;
    }

    public record PutRequest(JsonNode value, int ttlSeconds) {
    }

    public record CacheHit(String namespace, String key, JsonNode value) {
    }
}
