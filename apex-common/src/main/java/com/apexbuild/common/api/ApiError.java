package com.apexbuild.common.api;

import java.time.Instant;
import java.util.List;

public record ApiError(String code, String message, String traceId, Instant timestamp, List<String> details) {

    public static ApiError of(String code, String message, String traceId, List<String> details) {
        return new ApiError(code, message, traceId, Instant.now(), details == null ? List.of() : details);
    }
}
