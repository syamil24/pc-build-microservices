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
        http.csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/**", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers(publicPaths).permitAll()
                        .requestMatchers("/api/inventory/reservations/**", "/api/cache/**", "/api/users/internal/**").hasRole("INTERNAL")
                        .anyRequest().authenticated())
                .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(internal, JwtAuthenticationFilter.class);
        return http.build();
    }
}
