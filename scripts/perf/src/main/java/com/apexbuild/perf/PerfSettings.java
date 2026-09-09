package com.apexbuild.perf;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

final class PerfSettings {

    final Path root;
    final String dbHost;
    final int dbPort;
    final String dbName;
    final String dbUser;
    final String dbPassword;
    final String redisHost;
    final int redisPort;
    final boolean reload;

    private PerfSettings(Path root, String dbHost, int dbPort, String dbName, String dbUser, String dbPassword,
                         String redisHost, int redisPort, boolean reload) {
        this.root = root;
        this.dbHost = dbHost;
        this.dbPort = dbPort;
        this.dbName = dbName;
        this.dbUser = dbUser;
        this.dbPassword = dbPassword;
        this.redisHost = redisHost;
        this.redisPort = redisPort;
        this.reload = reload;
    }

    static PerfSettings load(String[] args) throws IOException {
        Path root = Path.of("").toAbsolutePath().normalize();
        Map<String, String> env = new HashMap<>();
        Path envFile = root.resolve(".env");
        if (Files.isRegularFile(envFile)) {
            for (String line : Files.readAllLines(envFile, StandardCharsets.UTF_8)) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#") || !trimmed.contains("=")) {
                    continue;
                }
                int split = trimmed.indexOf('=');
                env.putIfAbsent(trimmed.substring(0, split).trim(), trimmed.substring(split + 1).trim());
            }
        }
        boolean reload = false;
        String dbHost = first(env, "DB_HOST", "localhost");
        int dbPort = parsePort(first(env, "DB_PORT", "5432"), "DB_PORT");
        String dbName = "apex_perf";
        String dbUser = first(env, "DB_USERNAME", "postgres");
        String dbPassword = first(env, "DB_PASSWORD", "");
        String redisHost = first(env, "REDIS_HOST", "localhost");
        int redisPort = parsePort(first(env, "PERF_REDIS_PORT", first(env, "REDIS_PORT", "6379")), "REDIS_PORT");
        for (int i = 0; i < args.length; i++) {
            String arg = args[i];
            switch (arg) {
                case "--reload" -> reload = true;
                case "--db-host" -> dbHost = need(args, ++i, arg);
                case "--db-port" -> dbPort = parsePort(need(args, ++i, arg), arg);
                case "--db-name" -> dbName = need(args, ++i, arg);
                case "--db-user" -> dbUser = need(args, ++i, arg);
                case "--db-password" -> dbPassword = need(args, ++i, arg);
                case "--redis-host" -> redisHost = need(args, ++i, arg);
                case "--redis-port" -> redisPort = parsePort(need(args, ++i, arg), arg);
                case "--help", "-h" -> {
                    printHelp();
                    System.exit(0);
                }
                default -> throw new IllegalArgumentException("Unknown argument: " + arg);
            }
        }
        if (!dbName.matches("[A-Za-z_][A-Za-z0-9_]*")) {
            throw new IllegalArgumentException("Database name must be letters, digits, and underscores");
        }
        if (dbPassword.isBlank()) {
            throw new IllegalArgumentException("DB_PASSWORD is empty. Set it in .env and rerun.");
        }
        return new PerfSettings(root, dbHost, dbPort, dbName, dbUser, dbPassword, redisHost, redisPort, reload);
    }

    Path dataDir() {
        return root.resolve("scripts").resolve("perf").resolve("data");
    }

    Path portFile() {
        return root.resolve(".run").resolve("perf-redis.port");
    }

    String jdbc(String database) {
        return "jdbc:postgresql://" + dbHost + ":" + dbPort + "/" + database + "?connectTimeout=3&socketTimeout=120";
    }

    private static String first(Map<String, String> env, String key, String fallback) {
        String fromProcess = System.getenv(key);
        if (fromProcess != null && !fromProcess.isBlank()) {
            return fromProcess.trim();
        }
        String fromFile = env.get(key);
        if (fromFile != null && !fromFile.isBlank()) {
            return fromFile;
        }
        return fallback;
    }

    private static String need(String[] args, int index, String flag) {
        if (index >= args.length) {
            throw new IllegalArgumentException(flag + " needs a value");
        }
        return args[index];
    }

    private static int parsePort(String text, String name) {
        try {
            int port = Integer.parseInt(text);
            if (port < 1 || port > 65535) {
                throw new NumberFormatException(text);
            }
            return port;
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(name + " is not a port: " + text);
        }
    }

    private static void printHelp() {
        System.out.println("""
                Usage:
                  java -cp scripts/perf/target/perf-demo.jar com.apexbuild.perf.PerfImport [--reload]
                  java -cp scripts/perf/target/perf-demo.jar com.apexbuild.perf.PerfSearch

                Reads DB_* and REDIS_* from .env. Optional flags:
                  --db-host --db-port --db-name --db-user --db-password
                  --redis-host --redis-port
                  --reload    load the rows again even when they are already there
                """);
    }

    static void writePort(PerfSettings settings, String host, int port) throws IOException {
        Path file = settings.portFile();
        Files.createDirectories(file.getParent());
        Files.writeString(file, host + ":" + port + System.lineSeparator(), StandardCharsets.UTF_8);
    }

    static String rememberedRedis(PerfSettings settings) {
        Path file = settings.portFile();
        if (!Files.isRegularFile(file)) {
            return null;
        }
        try {
            List<String> lines = Files.readAllLines(file, StandardCharsets.UTF_8);
            if (lines.isEmpty() || lines.get(0).isBlank()) {
                return null;
            }
            return lines.get(0).trim();
        } catch (IOException ex) {
            return null;
        }
    }
}
