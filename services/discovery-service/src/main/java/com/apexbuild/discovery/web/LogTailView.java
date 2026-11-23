package com.apexbuild.discovery.web;

import java.util.List;

public record LogTailView(String file, List<String> lines, long nextOffset, long sizeBytes, boolean truncated,
                          boolean reset) {
}
