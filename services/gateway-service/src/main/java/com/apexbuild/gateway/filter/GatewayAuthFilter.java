package com.apexbuild.gateway.filter;

import com.apexbuild.common.security.JwtClaims;
import com.apexbuild.common.security.JwtService;
import com.apexbuild.common.trace.ApiActions;
import io.micrometer.observation.Observation;
import io.micrometer.tracing.handler.TracingObservationHandler.TracingContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpHeaders;
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
        String[] trace = traceIds(exchange);
        boolean stamped = false;
        if (blank(MDC.get("traceId")) && trace[0] != null) {
            MDC.put("traceId", trace[0]);
            if (trace[1] != null) {
                MDC.put("spanId", trace[1]);
            }
            stamped = true;
        }
        try {
            log.info(ApiActions.line(service, userId, role, method, path, status, System.currentTimeMillis() - started));
        } finally {
            if (stamped) {
                MDC.remove("traceId");
                MDC.remove("spanId");
            }
        }
    }

    /**
     * The arrival filter stores its observation on the exchange. This line is written
     * after that call returns, so the id is read back from the observation.
     */
    private String[] traceIds(ServerWebExchange exchange) {
        String[] fromSpan = fromObservation(exchange);
        if (fromSpan[0] != null) {
            return fromSpan;
        }
        HttpHeaders response = exchange.getResponse().getHeaders();
        if (!blank(response.getFirst("X-Trace-Id"))) {
            return new String[]{response.getFirst("X-Trace-Id"), response.getFirst("X-Span-Id")};
        }
        return parseTraceParent(exchange.getRequest().getHeaders().getFirst("traceparent"));
    }

    private String[] fromObservation(ServerWebExchange exchange) {
        Object raw = exchange.getAttribute("micrometer.observation");
        if (!(raw instanceof Observation observation)) {
            return new String[]{null, null};
        }
        TracingContext tracing = observation.getContext().get(TracingContext.class);
        if (tracing == null || tracing.getSpan() == null || tracing.getSpan().context() == null) {
            return new String[]{null, null};
        }
        return new String[]{tracing.getSpan().context().traceId(), tracing.getSpan().context().spanId()};
    }

    private String[] parseTraceParent(String header) {
        if (header == null) {
            return new String[]{null, null};
        }
        String[] parts = header.split("-");
        if (parts.length < 4 || parts[1].isBlank()) {
            return new String[]{null, null};
        }
        return new String[]{parts[1], parts[2]};
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
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
