package com.apexbuild.gateway.config;

import brave.baggage.BaggageFields;
import brave.baggage.CorrelationScopeConfig;
import brave.baggage.CorrelationScopeConfig.SingleCorrelationField;
import brave.baggage.CorrelationScopeCustomizer;
import brave.baggage.CorrelationScopeDecorator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;

@Configuration
public class TraceLogConfiguration {

    @Bean
    CorrelationScopeCustomizer traceIdsInLogs() {
        return TraceLogConfiguration::putTraceIdsInMdc;
    }

    /**
     * Brave already registers traceId and spanId. Adding them again throws
     * "Baggage Field already added". Replace that pair and keep every other field.
     */
    static void putTraceIdsInMdc(CorrelationScopeDecorator.Builder builder) {
        var kept = new ArrayList<CorrelationScopeConfig>();
        for (var config : builder.configs()) {
            if (config instanceof SingleCorrelationField field
                    && ("traceId".equals(field.name()) || "spanId".equals(field.name()))) {
                continue;
            }
            kept.add(config);
        }
        builder.clear();
        for (var config : kept) {
            builder.add(config);
        }
        builder.add(SingleCorrelationField.newBuilder(BaggageFields.TRACE_ID).flushOnUpdate().build());
        builder.add(SingleCorrelationField.newBuilder(BaggageFields.SPAN_ID).flushOnUpdate().build());
    }
}
