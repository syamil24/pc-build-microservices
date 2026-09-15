package com.apexbuild.inventory.config;

import com.apexbuild.web.security.InternalTokenFilter;
import com.apexbuild.web.security.JwtAuthenticationFilter;
import com.apexbuild.web.security.SecuritySupport;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwt, InternalTokenFilter internal)
            throws Exception {
        return SecuritySupport.api(http, jwt, internal, "/api/catalog/**");
    }
}
