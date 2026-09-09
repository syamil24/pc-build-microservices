package com.apexbuild.perf;

import redis.clients.jedis.Jedis;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

final class DemoRedis {

    static final long REQUIRED_BYTES = 512L * 1024L * 1024L;
    private static final int DEMO_PORT = 6380;

    private DemoRedis() {
    }

    static Endpoint prepare(PerfSettings settings) throws IOException, InterruptedException {
        Endpoint requested = new Endpoint(settings.redisHost, settings.redisPort);
        if (accepts(requested) && largeEnough(requested, false)) {
            PerfSettings.writePort(settings, requested.host, requested.port);
            return requested;
        }
        if (accepts(requested)) {
            PerfLog.warn("Redis at " + requested + " is capped below 512 MB. A million keys would be evicted, so it will not be used.");
        } else {
            PerfLog.warn("Redis at " + requested + " is not accepting connections.");
        }
        Endpoint demo = new Endpoint(settings.redisHost, DEMO_PORT);
        if (!accepts(demo)) {
            start(settings, demo);
        }
        if (!largeEnough(demo, true)) {
            throw new IOException("Redis at " + demo + " cannot hold a million keys. Start Redis with maxmemory 0 and rerun.");
        }
        PerfSettings.writePort(settings, demo.host, demo.port);
        return demo;
    }

    static Endpoint connectForSearch(PerfSettings settings) throws IOException {
        String remembered = PerfSettings.rememberedRedis(settings);
        Endpoint endpoint = remembered == null
                ? new Endpoint(settings.redisHost, settings.redisPort)
                : Endpoint.parse(remembered);
        if (!accepts(endpoint)) {
            throw new IOException("Redis is not accepting connections at " + endpoint + ". Run the import again.");
        }
        return endpoint;
    }

    static Jedis open(Endpoint endpoint) {
        Jedis jedis = new Jedis(endpoint.host, endpoint.port, 3000);
        jedis.connect();
        return jedis;
    }

    private static boolean largeEnough(Endpoint endpoint, boolean strict) {
        try (Jedis jedis = open(endpoint)) {
            String info = jedis.info("memory");
            long max = 0;
            for (String line : info.split("\n")) {
                if (line.startsWith("maxmemory:")) {
                    max = Long.parseLong(line.substring("maxmemory:".length()).trim());
                }
            }
            if (max == 0 || max >= REQUIRED_BYTES) {
                PerfLog.info("Redis " + endpoint + " maxmemory=" + (max == 0 ? "unlimited" : max + " bytes"));
                return true;
            }
            if (strict) {
                PerfLog.error("Redis " + endpoint + " maxmemory is " + max + " bytes");
            }
            return false;
        } catch (RuntimeException ex) {
            PerfLog.error("Could not read Redis memory settings at " + endpoint + ": " + ex.getMessage());
            return false;
        }
    }

    private static void start(PerfSettings settings, Endpoint endpoint) throws IOException, InterruptedException {
        Path home = Path.of(System.getProperty("user.home"), ".apex-build", "redis");
        Path windows = home.resolve("redis-server.exe");
        Path unix = home.resolve("redis-server");
        String binary = Files.isRegularFile(windows) ? windows.toString() : Files.isRegularFile(unix) ? unix.toString() : "redis-server";
        Path dir = settings.root.resolve(".run").resolve("perf-redis");
        Files.createDirectories(dir);
        Path conf = dir.resolve("redis.conf");
        String config = "bind " + endpoint.host + "\n"
                + "port " + endpoint.port + "\n"
                + "protected-mode yes\n"
                + "maxmemory 0\n"
                + "appendonly no\n"
                + "save \"\"\n"
                + "dir " + dir.toAbsolutePath().toString().replace('\\', '/') + "\n"
                + "dbfilename dump.rdb\n"
                + "logfile " + dir.resolve("redis.log").toAbsolutePath().toString().replace('\\', '/') + "\n";
        Files.writeString(conf, config, StandardCharsets.UTF_8);
        PerfLog.info("Starting a demo Redis at " + endpoint + " with no memory cap");
        ProcessBuilder builder = new ProcessBuilder(binary, conf.toAbsolutePath().toString());
        builder.redirectOutput(dir.resolve("redis.out.log").toFile());
        builder.redirectError(dir.resolve("redis.err.log").toFile());
        try {
            builder.start();
        } catch (IOException ex) {
            throw new IOException("Redis is down and redis-server was not found. Run scripts/install-deps and rerun. " + ex.getMessage());
        }
        long deadline = System.nanoTime() + Duration.ofSeconds(15).toNanos();
        while (System.nanoTime() < deadline) {
            if (accepts(endpoint)) {
                PerfLog.info("Demo Redis is accepting connections at " + endpoint);
                return;
            }
            Thread.sleep(250);
        }
        throw new IOException("Demo Redis did not open " + endpoint + ". See " + dir.resolve("redis.err.log"));
    }

    private static boolean accepts(Endpoint endpoint) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(endpoint.host, endpoint.port), 1000);
            return true;
        } catch (IOException ex) {
            return false;
        }
    }

    record Endpoint(String host, int port) {
        static Endpoint parse(String text) {
            int split = text.lastIndexOf(':');
            if (split < 1) {
                throw new IllegalArgumentException("Redis address must be host:port");
            }
            return new Endpoint(text.substring(0, split), Integer.parseInt(text.substring(split + 1)));
        }

        @Override
        public String toString() {
            return host + ":" + port;
        }
    }
}
