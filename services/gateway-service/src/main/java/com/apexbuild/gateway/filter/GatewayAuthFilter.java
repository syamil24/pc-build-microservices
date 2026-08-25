package com.apexbuild.gateway.filter;

import com.apexbuild.common.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

@Component
public class GatewayAuthFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(GatewayAuthFilter.class);

    private final JwtService jwtService;

    public GatewayAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        var request = exchange.getRequest();
        String path = request.getURI().getPath();
        String method = request.getMethod().name();
        long started = System.currentTimeMillis();
        ServerWebExchange cleaned = exchange.mutate()
                .request(builder -> builder.headers(headers -> headers.remove("X-Internal-Token")))
                .build();
        if (isPublic(path, method)) {
            return chain.filter(cleaned).doFinally(signal -> log.info("gateway {} {} -> {} in {}ms", method, path,
                    cleaned.getResponse().getStatusCode(), System.currentTimeMillis() - started));
        }
        String header = request.getHeaders().getFirst("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            return unauthorized(cleaned);
        }
        try {
            jwtService.parse(header.substring(7));
        } catch (RuntimeException ex) {
            return unauthorized(cleaned);
        }
        return chain.filter(cleaned).doFinally(signal -> log.info("gateway {} {} -> {} in {}ms", method, path,
                cleaned.getResponse().getStatusCode(), System.currentTimeMillis() - started));
    }

    private boolean isPublic(String path, String method) {
        if ("OPTIONS".equals(method)) {
            return true;
        }
        if (path.startsWith("/api/catalog") || path.startsWith("/api/platform") || path.startsWith("/actuator")) {
            return true;
        }
        return "POST".equals(method) && (path.equals("/api/auth/register") || path.equals("/api/auth/login")
                || path.equals("/api/auth/refresh") || path.equals("/api/payments/chip/callback"));
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        byte[] body = "{\"success\":false,\"error\":{\"code\":\"UNAUTHORIZED\",\"message\":\"Login required\"}}"
                .getBytes(StandardCharsets.UTF_8);
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(body);
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
