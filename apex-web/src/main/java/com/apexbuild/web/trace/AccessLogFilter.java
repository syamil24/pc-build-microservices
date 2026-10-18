package com.apexbuild.web.trace;

import com.apexbuild.common.trace.ApiActions;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class AccessLogFilter extends OncePerRequestFilter {

    public static final String USER_ID = "apex.userId";
    public static final String ROLE = "apex.role";

    private static final Logger log = LoggerFactory.getLogger(AccessLogFilter.class);

    private final String service;

    public AccessLogFilter(String service) {
        this.service = service;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long started = System.currentTimeMillis();
        try {
            chain.doFilter(request, response);
        } finally {
            String path = request.getRequestURI();
            if (!path.startsWith("/actuator") && !"OPTIONS".equals(request.getMethod())) {
                log.info(ApiActions.line(service, text(request.getAttribute(USER_ID)), text(request.getAttribute(ROLE)),
                        request.getMethod(), path, response.getStatus(), System.currentTimeMillis() - started));
            }
        }
    }

    private static String text(Object value) {
        return value == null ? null : value.toString();
    }
}
