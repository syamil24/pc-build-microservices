package com.apexbuild.discovery.web;

import java.time.Instant;

public record LogFileView(String name, long sizeBytes, Instant lastModified) {
}
