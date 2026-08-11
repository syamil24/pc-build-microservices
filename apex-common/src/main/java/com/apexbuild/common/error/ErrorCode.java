package com.apexbuild.common.error;

public enum ErrorCode {
    VALIDATION_ERROR(400),
    UNAUTHORIZED(401),
    FORBIDDEN(403),
    NOT_FOUND(404),
    CONFLICT(409),
    CIRCUIT_OPEN(503),
    DEPENDENCY_FAILED(502);

    private final int status;

    ErrorCode(int status) {
        this.status = status;
    }

    public int status() {
        return status;
    }
}
