package com.apexbuild.gateway.filter;

import com.apexbuild.common.security.JwtClaims;
import com.apexbuild.common.security.JwtService;
import com.apexbuild.common.trace.ApiActions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
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
    private final String service;

    public GatewayAuthFilter(JwtService jwtService, @Value("${spring.application.name:gateway-service}") String service) {
        this.jwtService = jwtService;
        this.service = service;
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
        JwtClaims claims = readClaims(request.getHeaders().getFirst("Authorization"));
        if (isPublic(path, method)) {
            return chain.filter(cleaned).doFinally(signal -> write(cleaned, method, path, started, claims));
        }
        if (claims == null) {
            return unauthorized(cleaned, method, path, started);
        }
        if (isAdminOnly(path) && !"ADMIN".equals(claims.role())) {
            return forbidden(cleaned, method, path, started, claims);
        }
        return chain.filter(cleaned).doFinally(signal -> write(cleaned, method, path, started, claims));
    }

    private JwtClaims readClaims(String header) {
        if (header == null || !header.startsWith("Bearer ")) {
            return null;
        }
        try {
            return jwtService.parse(header.substring(7));
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private void write(ServerWebExchange exchange, String method, String path, long started, JwtClaims claims) {
        String userId = claims == null || claims.userId() == null ? null : claims.userId().toString();
        String role = claims == null ? null : claims.role();
        write(exchange, method, path, started, userId, role);
    }

    private void write(ServerWebExchange exchange, String method, String path, long started, String userId, String role) {
        if (path.startsWith("/actuator") || "OPTIONS".equals(method)) {
            return;
        }
        int status = exchange.getResponse().getStatusCode() == null ? 0 : exchange.getResponse().getStatusCode().value();
        log.info(ApiActions.line(service, userId, role, method, path, status, System.currentTimeMillis() - started));
    }

    private boolean isPublic(String path, String method) {
        if ("OPTIONS".equals(method)) {
            return true;
        }
        if (path.startsWith("/actuator")) {
            return true;
        }
        if (path.startsWith("/api/catalog") && !path.startsWith("/api/catalog/admin")) {
            if ("GET".equals(method)) {
                return true;
            }
            return "POST".equals(method) && path.equals("/api/catalog/builder/quote");
        }
        return "POST".equals(method) && (path.equals("/api/auth/register") || path.equals("/api/auth/login")
                || path.equals("/api/auth/refresh") || path.equals("/api/payments/chip/callback"));
    }

    private boolean isAdminOnly(String path) {
        return path.startsWith("/api/platform") || path.startsWith("/api/reports") || path.startsWith("/api/catalog/admin");
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String method, String path, long started) {
        byte[] body = "{\"success\":false,\"error\":{\"code\":\"UNAUTHORIZED\",\"message\":\"Login required\"}}"
                .getBytes(StandardCharsets.UTF_8);
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        write(exchange, method, path, started, null, null);
        DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(body);
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }

    private Mono<Void> forbidden(ServerWebExchange exchange, String method, String path, long started, JwtClaims claims) {
        byte[] body = "{\"success\":false,\"error\":{\"code\":\"FORBIDDEN\",\"message\":\"Admin access required\"}}"
                .getBytes(StandardCharsets.UTF_8);
        exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String userId = claims.userId() == null ? null : claims.userId().toString();
        write(exchange, method, path, started, userId, claims.role());
        DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(body);
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
