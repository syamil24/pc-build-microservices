package com.apexbuild.common.config;

import com.apexbuild.common.security.JwtService;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

@AutoConfiguration
@EnableConfigurationProperties(ApexProperties.class)
public class ApexCommonAutoConfiguration {

    @Bean
    @ConditionalOnProperty(prefix = "apex", name = "jwt-secret")
    JwtService jwtService(ApexProperties properties) {
        return new JwtService(properties.getJwtSecret());
    }
}
