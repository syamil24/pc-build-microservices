package com.apexbuild.web.security;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

public final class SecuritySupport {

    private SecuritySupport() {
    }

    public static SecurityFilterChain api(HttpSecurity http, JwtAuthenticationFilter jwt, InternalTokenFilter internal,
                                          String... publicPaths) throws Exception {
        return api(http, jwt, internal, publicPaths, new String[0]);
    }

    public static SecurityFilterChain api(HttpSecurity http, JwtAuthenticationFilter jwt, InternalTokenFilter internal,
                                          String[] publicPaths, String[] adminPaths) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    var rules = auth.requestMatchers("/actuator/**", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll();
                    if (publicPaths.length > 0) {
                        rules = rules.requestMatchers(publicPaths).permitAll();
                    }
                    rules = rules.requestMatchers("/api/inventory/reservations/**", "/api/cache/**", "/api/users/internal/**",
                                    "/api/orders/internal/**").hasRole("INTERNAL");
                    if (adminPaths.length > 0) {
                        rules = rules.requestMatchers(adminPaths).hasRole("ADMIN");
                    }
                    rules.anyRequest().authenticated();
                })
                .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(internal, JwtAuthenticationFilter.class);
        return http.build();
    }
}
