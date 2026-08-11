package com.apexbuild.common.error;

/**
 * A 4xx response from another Apex service. Circuit breakers ignore this type
 * so a bad request does not open the breaker.
 */
public class RemoteClientException extends RuntimeException {

    private final int status;

    public RemoteClientException(int status, String message) {
        super(message);
        this.status = status;
    }

    public int status() {
        return status;
    }
}
