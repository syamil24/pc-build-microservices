package com.apexbuild.cache.config;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * The default Redis health check loads the INFO reply as Java properties.
 * The Windows Redis port reports a lowercase executable path under the user profile,
 * which contains a backslash-u sequence that is not a valid properties escape.
 */
@Component
public class RedisPingHealthIndicator implements HealthIndicator {

    private final StringRedisTemplate redis;

    public RedisPingHealthIndicator(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    public Health health() {
        try {
            String pong = redis.execute(connection -> connection.ping(), true);
            if (pong == null) {
                return Health.down().withDetail("ping", "no response").build();
            }
            return Health.up().withDetail("ping", pong).build();
        } catch (RuntimeException ex) {
            return Health.down(ex).build();
        }
    }
}
