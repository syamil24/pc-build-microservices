package com.apexbuild.perf;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

final class PerfLog {

    private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

    private PerfLog() {
    }

    static void info(String message) {
        System.out.println(stamp() + " INFO  " + message);
    }

    static void warn(String message) {
        System.out.println(stamp() + " WARN  " + message);
    }

    static void error(String message) {
        System.err.println(stamp() + " ERROR " + message);
    }

    private static String stamp() {
        return LocalDateTime.now().format(CLOCK);
    }
}
