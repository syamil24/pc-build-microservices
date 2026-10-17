package com.apexbuild.discovery.web;

import com.apexbuild.common.security.JwtClaims;
import com.apexbuild.common.security.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class PlatformAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public PlatformAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path == null || !path.startsWith("/api/platform");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if ("OPTIONS".equals(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            write(response, 401, "UNAUTHORIZED", "Login required");
            return;
        }
        try {
            JwtClaims claims = jwtService.parse(header.substring(7));
            if (!"ADMIN".equals(claims.role())) {
                write(response, 403, "FORBIDDEN", "Admin access required");
                return;
            }
        } catch (RuntimeException ex) {
            write(response, 401, "UNAUTHORIZED", "Login required");
            return;
        }
        chain.doFilter(request, response);
    }

    private void write(HttpServletResponse response, int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        byte[] body = ("{\"success\":false,\"error\":{\"code\":\"" + code + "\",\"message\":\"" + message + "\"}}")
                .getBytes(StandardCharsets.UTF_8);
        response.getOutputStream().write(body);
    }
}
