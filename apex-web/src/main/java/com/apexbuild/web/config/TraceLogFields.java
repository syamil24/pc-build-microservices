package com.apexbuild.web.config;

import brave.baggage.BaggageFields;
import brave.baggage.CorrelationScopeConfig;
import brave.baggage.CorrelationScopeConfig.SingleCorrelationField;
import brave.baggage.CorrelationScopeDecorator;

import java.util.ArrayList;

/**
 * Brave already puts traceId and spanId on the log context. Adding them again
 * throws "Baggage Field already added". This replaces that pair so a new span
 * updates the log line, and leaves every other field alone.
 */
public final class TraceLogFields {

    private TraceLogFields() {
    }

    public static void putTraceIdsInMdc(CorrelationScopeDecorator.Builder builder) {
        var kept = new ArrayList<CorrelationScopeConfig>();
        for (var config : builder.configs()) {
            if (config instanceof SingleCorrelationField field && isTraceField(field.name())) {
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

    private static boolean isTraceField(String name) {
        return "traceId".equals(name) || "spanId".equals(name);
    }
}
