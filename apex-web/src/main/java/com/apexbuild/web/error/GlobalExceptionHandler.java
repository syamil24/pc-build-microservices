package com.apexbuild.web.error;

import com.apexbuild.common.api.ApiError;
import com.apexbuild.common.api.ApiResponse;
import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import com.apexbuild.common.error.RemoteClientException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApexException.class)
    ResponseEntity<ApiResponse<Void>> apex(ApexException ex) {
        return body(ex.code().name(), ex.getMessage(), ex.code().status(), List.of());
    }

    @ExceptionHandler(RemoteClientException.class)
    ResponseEntity<ApiResponse<Void>> remote(RemoteClientException ex) {
        return body("DEPENDENCY_REJECTED", ex.getMessage(), ex.status(), List.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse<Void>> validation(MethodArgumentNotValidException ex) {
        List<String> details = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .toList();
        return body(ErrorCode.VALIDATION_ERROR.name(), "Request is invalid", 400, details);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiResponse<Void>> denied(AccessDeniedException ex) {
        return body(ErrorCode.FORBIDDEN.name(), "You cannot perform this action", 403, List.of());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiResponse<Void>> unexpected(Exception ex) {
        log.error("Unhandled error", ex);
        return body("INTERNAL", "Something went wrong", 500, List.of());
    }

    private ResponseEntity<ApiResponse<Void>> body(String code, String message, int status, List<String> details) {
        ApiError error = ApiError.of(code, message, MDC.get("traceId"), details);
        return ResponseEntity.status(status).body(ApiResponse.fail(error));
    }
}
