package com.apexbuild.discovery.web;

import java.time.Instant;
import java.util.List;

public record PlatformOverview(Instant generatedAt, List<ServiceSnapshot> services) {

    public record ServiceSnapshot(String name, List<InstanceSnapshot> instances) {
    }

    public record InstanceSnapshot(String instanceId, String status, String uri, Double cpuUsage, Long heapUsedBytes,
                                   Long heapMaxBytes, Long diskFreeBytes, Double uptimeSeconds) {
    }
}
