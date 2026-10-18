package com.apexbuild.gateway.filter;

import com.apexbuild.common.security.JwtClaims;
import com.apexbuild.common.security.JwtService;
import com.apexbuild.common.trace.ApiActions;
import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationRegistry;
import io.micrometer.observation.contextpropagation.ObservationThreadLocalAccessor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/**
 * Opens one trace as a request enters the gateway and logs that arrival.
 * The gateway's outbound call is a child of this trace, so the same trace id
 * shows up in the service that handles the request.
 */
@Component
public class GatewayInboundTraceFilter implements WebFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(GatewayInboundTraceFilter.class);

    private final ObservationRegistry registry;
    private final JwtService jwtService;
    private final String service;

    public GatewayInboundTraceFilter(ObservationRegistry registry, JwtService jwtService,
                                     @Value("${spring.application.name:gateway-service}") String service) {
        this.registry = registry;
        this.jwtService = jwtService;
        this.service = service;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        String method = exchange.getRequest().getMethod().name();
        if (path.startsWith("/actuator") || "OPTIONS".equals(method)) {
            return chain.filter(exchange);
        }
        Observation observation = Observation.createNotStarted("http.server.requests", registry)
                .contextualName(method + " " + path)
                .start();
        exchange.getAttributes().put(ObservationThreadLocalAccessor.KEY, observation);
        JwtClaims claims = readClaims(exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
        String userId = claims == null || claims.userId() == null ? null : claims.userId().toString();
        String role = claims == null ? null : claims.role();
        try (Observation.Scope ignored = observation.openScope()) {
            log.info(ApiActions.received(service, userId, role, method, path));
        }
        return chain.filter(exchange)
                .doOnError(observation::error)
                .doFinally(signal -> observation.stop())
                .contextWrite(context -> context.put(ObservationThreadLocalAccessor.KEY, observation));
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

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
