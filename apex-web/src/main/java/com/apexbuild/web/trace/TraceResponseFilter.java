package com.apexbuild.web.trace;

import com.apexbuild.common.config.ApexProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class TraceResponseFilter extends OncePerRequestFilter {

    private final ApexProperties properties;

    public TraceResponseFilter(ApexProperties properties) {
        this.properties = properties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        response.setHeader("X-Service-Instance", properties.getInstanceId());
        chain.doFilter(request, response);
        String traceId = MDC.get("traceId");
        if (traceId != null && !traceId.isBlank()) {
            response.setHeader("X-Trace-Id", traceId);
        }
    }
}
