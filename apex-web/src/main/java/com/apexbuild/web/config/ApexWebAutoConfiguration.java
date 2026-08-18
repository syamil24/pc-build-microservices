package com.apexbuild.web.config;

import com.apexbuild.common.config.ApexProperties;
import com.apexbuild.web.cache.CacheClient;
import com.apexbuild.web.error.GlobalExceptionHandler;
import com.apexbuild.web.http.ProtectedCall;
import com.apexbuild.web.http.RemoteClients;
import com.apexbuild.web.messaging.EventPublisher;
import com.apexbuild.web.security.InternalTokenFilter;
import com.apexbuild.web.security.JwtAuthenticationFilter;
import com.apexbuild.web.trace.AccessLogFilter;
import com.apexbuild.web.trace.TraceResponseFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.web.client.RestClientBuilderConfigurer;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.client.RestClient;

@AutoConfiguration
public class ApexWebAutoConfiguration {

    @Bean
    GlobalExceptionHandler globalExceptionHandler() {
        return new GlobalExceptionHandler();
    }

    @Bean
    org.springframework.boot.ApplicationRunner secretCheck(ApexProperties properties) {
        return args -> {
            if (properties.getInternalToken() == null || properties.getInternalToken().length() < 16) {
                throw new IllegalStateException("INTERNAL_SERVICE_TOKEN must be at least 16 characters");
            }
        };
    }

    @Bean
    @LoadBalanced
    RestClient.Builder loadBalancedRestClientBuilder(org.springframework.beans.factory.ObjectProvider<RestClientBuilderConfigurer> configurers) {
        RestClient.Builder builder = RestClient.builder();
        configurers.ifAvailable(configurer -> configurer.configure(builder));
        return builder;
    }

    @Bean
    ProtectedCall protectedCall(CircuitBreakerRegistry registry) {
        return new ProtectedCall(registry);
    }

    @Bean
    RemoteClients remoteClients(@LoadBalanced RestClient.Builder builder, ApexProperties properties, ProtectedCall protectedCall) {
        return new RemoteClients(builder, properties, protectedCall);
    }

    @Bean
    @ConditionalOnProperty(prefix = "apex.cache", name = "client-enabled", matchIfMissing = true)
    CacheClient cacheClient(RemoteClients remoteClients, ObjectMapper objectMapper) {
        return new CacheClient(remoteClients, objectMapper);
    }

    @Bean
    @ConditionalOnClass(KafkaTemplate.class)
    EventPublisher eventPublisher(ObjectProvider<KafkaTemplate<String, String>> kafkaTemplate, ObjectMapper objectMapper) {
        return new EventPublisher(kafkaTemplate, objectMapper);
    }

    @Bean
    JwtAuthenticationFilter jwtAuthenticationFilter(com.apexbuild.common.security.JwtService jwtService) {
        return new JwtAuthenticationFilter(jwtService);
    }

    @Bean
    InternalTokenFilter internalTokenFilter(ApexProperties properties) {
        return new InternalTokenFilter(properties);
    }

    @Bean
    FilterRegistrationBean<JwtAuthenticationFilter> jwtRegistration(JwtAuthenticationFilter filter) {
        FilterRegistrationBean<JwtAuthenticationFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    FilterRegistrationBean<InternalTokenFilter> internalRegistration(InternalTokenFilter filter) {
        FilterRegistrationBean<InternalTokenFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    FilterRegistrationBean<TraceResponseFilter> traceRegistration(ApexProperties properties) {
        FilterRegistrationBean<TraceResponseFilter> registration = new FilterRegistrationBean<>(new TraceResponseFilter(properties));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }

    @Bean
    FilterRegistrationBean<AccessLogFilter> accessLogRegistration() {
        FilterRegistrationBean<AccessLogFilter> registration = new FilterRegistrationBean<>(new AccessLogFilter());
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 1);
        return registration;
    }
}
