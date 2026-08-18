package com.apexbuild.web.http;

import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import com.apexbuild.common.error.RemoteClientException;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;

import java.util.function.Supplier;

public class ProtectedCall {

    private final CircuitBreakerRegistry registry;

    public ProtectedCall(CircuitBreakerRegistry registry) {
        this.registry = registry;
    }

    public <T> T run(String name, Supplier<T> call) {
        CircuitBreaker breaker = registry.circuitBreaker(name);
        try {
            return CircuitBreaker.decorateSupplier(breaker, call).get();
        } catch (CallNotPermittedException ex) {
            throw new ApexException(ErrorCode.CIRCUIT_OPEN, name + " is temporarily unavailable");
        } catch (RemoteClientException | ApexException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new ApexException(ErrorCode.DEPENDENCY_FAILED, name + " call failed: " + ex.getMessage());
        }
    }
}
