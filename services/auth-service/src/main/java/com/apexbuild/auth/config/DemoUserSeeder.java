package com.apexbuild.auth.config;

import com.apexbuild.auth.service.AuthService;
import com.apexbuild.auth.web.AuthRequests.RegisterRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(20)
@ConditionalOnProperty(prefix = "apex.seed", name = "enabled", havingValue = "true")
public class DemoUserSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoUserSeeder.class);

    private final AuthService authService;
    private final SeedProperties properties;

    public DemoUserSeeder(AuthService authService, SeedProperties properties) {
        this.authService = authService;
        this.properties = properties;
    }

    @Override
    public void run(ApplicationArguments args) {
        seed(properties.getAdminEmail(), properties.getAdminPassword(), "Demo Admin", "ADMIN");
        seed(properties.getCustomerEmail(), properties.getCustomerPassword(), "Demo Customer", "CUSTOMER");
    }

    private void seed(String email, String password, String fullName, String role) {
        if (password == null || password.isBlank()) {
            log.warn("Skipping {} seed because the password env var is empty", role);
            return;
        }
        try {
            authService.ensureSeeded(new RegisterRequest(email, password, fullName), role);
            log.info("Seeded {} {}", role, email);
        } catch (RuntimeException ex) {
            log.info("Seed skipped for {} ({})", email, ex.getMessage());
        }
    }
}
