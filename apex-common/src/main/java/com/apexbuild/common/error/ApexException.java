package com.apexbuild.common.error;

public class ApexException extends RuntimeException {

    private final ErrorCode code;

    public ApexException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }
}
