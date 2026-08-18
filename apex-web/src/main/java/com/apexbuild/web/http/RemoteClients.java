package com.apexbuild.web.http;

import com.apexbuild.common.config.ApexProperties;
import com.apexbuild.common.error.RemoteClientException;
import com.apexbuild.web.security.InternalTokenFilter;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.function.Function;

public class RemoteClients {

    private final RestClient.Builder builder;
    private final ProtectedCall protectedCall;

    public RemoteClients(RestClient.Builder builder, ApexProperties properties, ProtectedCall protectedCall) {
        this.builder = builder.defaultHeader(InternalTokenFilter.HEADER, properties.getInternalToken());
        this.protectedCall = protectedCall;
    }

    public synchronized RestClient client(String serviceName) {
        return builder.baseUrl("http://" + serviceName).build();
    }

    public <T> T call(String breaker, String serviceName, Function<RestClient, T> action) {
        RestClient client = client(serviceName);
        return protectedCall.run(breaker, () -> {
            try {
                return action.apply(client);
            } catch (RestClientResponseException ex) {
                if (ex.getStatusCode().is4xxClientError()) {
                    throw new RemoteClientException(ex.getStatusCode().value(), extract(ex));
                }
                throw ex;
            }
        });
    }

    private String extract(RestClientResponseException ex) {
        String body = ex.getResponseBodyAsString();
        if (body == null || body.isBlank()) {
            return ex.getStatusText();
        }
        int message = body.indexOf("\"message\"");
        if (message < 0) {
            return ex.getStatusText();
        }
        int start = body.indexOf('"', message + 9);
        int end = start < 0 ? -1 : body.indexOf('"', start + 1);
        if (start < 0 || end < 0) {
            return ex.getStatusText();
        }
        return body.substring(start + 1, end);
    }
}
