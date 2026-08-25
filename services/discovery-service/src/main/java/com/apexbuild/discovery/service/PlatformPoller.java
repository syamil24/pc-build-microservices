package com.apexbuild.discovery.service;

import com.apexbuild.discovery.web.PlatformOverview;
import com.apexbuild.discovery.web.PlatformOverview.InstanceSnapshot;
import com.apexbuild.discovery.web.PlatformOverview.ServiceSnapshot;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.netflix.appinfo.InstanceInfo;
import com.netflix.discovery.shared.Application;
import com.netflix.eureka.EurekaServerContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class PlatformPoller {

    private static final Logger log = LoggerFactory.getLogger(PlatformPoller.class);

    private final org.springframework.beans.factory.ObjectProvider<EurekaServerContext> eureka;
    private final ObjectMapper objectMapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
    private final AtomicReference<PlatformOverview> latest = new AtomicReference<>(
            new PlatformOverview(Instant.now(), List.of()));

    public PlatformPoller(org.springframework.beans.factory.ObjectProvider<EurekaServerContext> eureka, ObjectMapper objectMapper) {
        this.eureka = eureka;
        this.objectMapper = objectMapper;
    }

    public PlatformOverview latest() {
        return latest.get();
    }

    @Scheduled(fixedDelayString = "${apex.platform-poll-ms:10000}")
    public void poll() {
        EurekaServerContext context = eureka.getIfAvailable();
        if (context == null) {
            return;
        }
        List<ServiceSnapshot> services = new ArrayList<>();
        for (Application application : context.getRegistry().getApplications().getRegisteredApplications()) {
            List<InstanceSnapshot> instances = new ArrayList<>();
            for (InstanceInfo info : application.getInstances()) {
                instances.add(probe(info));
            }
            instances.sort(Comparator.comparing(InstanceSnapshot::instanceId));
            services.add(new ServiceSnapshot(application.getName().toLowerCase(), instances));
        }
        services.sort(Comparator.comparing(ServiceSnapshot::name));
        latest.set(new PlatformOverview(Instant.now(), services));
    }

    private InstanceSnapshot probe(InstanceInfo info) {
        String uri = "http://" + info.getIPAddr() + ":" + info.getPort();
        String status = info.getStatus().name();
        Double cpu = null;
        Long heapUsed = null;
        Long heapMax = null;
        Long diskFree = null;
        Double uptime = null;
        try {
            JsonNode health = get(uri + "/actuator/health");
            if (health != null) {
                status = health.path("status").asText(status);
                diskFree = health.path("components").path("diskSpace").path("details").path("free").asLong();
                if (diskFree == 0 && health.path("components").path("diskSpace").path("details").path("free").isMissingNode()) {
                    diskFree = null;
                }
            }
            cpu = metric(uri, "/actuator/metrics/system.cpu.usage");
            heapUsed = longMetric(uri, "/actuator/metrics/jvm.memory.used?tag=area:heap");
            heapMax = longMetric(uri, "/actuator/metrics/jvm.memory.max?tag=area:heap");
            uptime = metric(uri, "/actuator/metrics/process.uptime");
        } catch (Exception ex) {
            log.debug("Probe failed for {}: {}", info.getInstanceId(), ex.getMessage());
            status = "DOWN";
        }
        return new InstanceSnapshot(info.getInstanceId(), status, uri, cpu, heapUsed, heapMax, diskFree, uptime);
    }

    private Double metric(String base, String path) throws Exception {
        JsonNode node = get(base + path);
        if (node == null) {
            return null;
        }
        return node.path("measurements").path(0).path("value").asDouble();
    }

    private Long longMetric(String base, String path) throws Exception {
        Double value = metric(base, path);
        return value == null ? null : value.longValue();
    }

    private JsonNode get(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(2))
                .GET()
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            return null;
        }
        return objectMapper.readTree(response.body());
    }
}
