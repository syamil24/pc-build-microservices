package com.apexbuild.web.security;

import com.apexbuild.common.config.ApexProperties;
import com.apexbuild.web.trace.AccessLogFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

public class InternalTokenFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Internal-Token";

    private final ApexProperties properties;

    public InternalTokenFilter(ApexProperties properties) {
        this.properties = properties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String presented = request.getHeader(HEADER);
            String expected = properties.getInternalToken();
            if (expected != null && !expected.isBlank() && expected.equals(presented)) {
                var authentication = new UsernamePasswordAuthenticationToken("internal", null,
                        List.of(new SimpleGrantedAuthority("ROLE_INTERNAL")));
                SecurityContextHolder.getContext().setAuthentication(authentication);
                request.setAttribute(AccessLogFilter.USER_ID, "internal");
                request.setAttribute(AccessLogFilter.ROLE, "INTERNAL");
            }
        }
        chain.doFilter(request, response);
    }
}
