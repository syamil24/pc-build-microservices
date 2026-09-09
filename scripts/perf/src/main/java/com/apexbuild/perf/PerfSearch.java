package com.apexbuild.perf;

import redis.clients.jedis.Jedis;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Arrays;
import java.util.Locale;
import java.util.Random;

public final class PerfSearch {

    private static final int WARMUP = 40;
    private static final int MEASURED = 400;
    private static final int SCAN_WARMUP = 2;
    private static final int SCAN_MEASURED = 30;
    private static final long SEED = 42L;

    public static void main(String[] args) {
        try {
            PerfSettings settings = PerfSettings.load(args);
            DemoRedis.Endpoint redis = DemoRedis.connectForSearch(settings);
            Rows rows = loadRows(settings);
            long[] targets = targets(rows.count());
            PerfLog.info("Loaded " + rows.count() + " ordered rows into memory in " + rows.loadMillis + " ms");
            PerfLog.info("Each method looks up the same " + MEASURED + " ids (seed " + SEED + ") after " + WARMUP + " discarded warm-up lookups");
            verify(settings, redis, rows, targets);
            try (Connection conn = PerfImport.open(settings, settings.dbName);
                 PreparedStatement query = conn.prepareStatement(
                         "SELECT user_id, movie_id, rating, rated_at FROM perf_rating WHERE id = ?")) {
                report("Postgres primary key", time(targets, id -> read(query, id)));
            }
            try (Jedis jedis = DemoRedis.open(redis)) {
                report("Redis GET", time(targets, id -> jedis.get(PerfImport.key(id))));
            }
            report("Linear search", time(targets, id -> {
                int index = linear(rows.ids, id);
                return index < 0 ? null : rows.values[index];
            }));
            report("Binary search", time(targets, id -> {
                int index = binary(rows.ids, id);
                return index < 0 ? null : rows.values[index];
            }));
            PerfLog.info("Unindexed Postgres lookup uses user and movie, which have no index, so each lookup reads the whole table. Measured " + SCAN_MEASURED + " times.");
            try (Connection conn = PerfImport.open(settings, settings.dbName);
                 PreparedStatement scan = conn.prepareStatement(
                         "SELECT user_id, movie_id, rating, rated_at FROM perf_rating WHERE user_id = ? AND movie_id = ?")) {
                report("Postgres table scan", timeScan(rows, targets, scan));
            }
            PerfLog.info("Indexed Postgres and Redis both fetch one row by id. On this machine both are in memory, so the gap is small and Redis still wins the round trip.");
            PerfLog.info("The table scan is the slow database path: Postgres reads all " + rows.count() + " rows to find one rating. Redis still fetches that rating by key.");
            PerfLog.info("Binary search only touches about 20 ids. Linear search walks from the start of the million-row array until it finds the id.");
        } catch (IllegalArgumentException ex) {
            PerfLog.error(ex.getMessage());
            System.exit(2);
        } catch (SQLException ex) {
            PerfLog.error(ex.getMessage());
            System.exit(2);
        } catch (Exception ex) {
            PerfLog.error(ex.getMessage() == null ? ex.toString() : ex.getMessage());
            System.exit(3);
        }
    }

    private static void verify(PerfSettings settings, DemoRedis.Endpoint redis, Rows rows, long[] targets) throws SQLException {
        int sample = Math.min(20, targets.length);
        try (Connection conn = PerfImport.open(settings, settings.dbName);
             PreparedStatement query = conn.prepareStatement(
                     "SELECT user_id, movie_id, rating, rated_at FROM perf_rating WHERE id = ?");
             Jedis jedis = DemoRedis.open(redis)) {
            for (int i = 0; i < sample; i++) {
                long id = targets[i];
                int index = binary(rows.ids, id);
                String memory = index < 0 ? null : rows.values[index];
                String postgres = read(query, id);
                String cached = jedis.get(PerfImport.key(id));
                if (memory == null || !memory.equals(postgres) || !memory.equals(cached)) {
                    throw new IllegalStateException("id " + id + " does not match across memory, Postgres, and Redis");
                }
            }
        }
        PerfLog.info("Checked " + sample + " ids. Postgres, Redis, and the in-memory rows returned the same rating.");
    }

    private static String read(PreparedStatement query, long id) throws SQLException {
        query.setLong(1, id);
        try (ResultSet rows = query.executeQuery()) {
            if (!rows.next()) {
                return null;
            }
            return rows.getInt(1) + "," + rows.getInt(2) + "," + rows.getInt(3) + "," + rows.getLong(4);
        }
    }

    private static Rows loadRows(PerfSettings settings) throws SQLException {
        long started = System.nanoTime();
        try (Connection conn = PerfImport.open(settings, settings.dbName);
             Statement statement = conn.createStatement()) {
            statement.setFetchSize(10_000);
            long count;
            try (ResultSet rows = statement.executeQuery("SELECT count(*) FROM perf_rating")) {
                rows.next();
                count = rows.getLong(1);
            }
            if (count < 1000) {
                throw new IllegalStateException("apex_perf.perf_rating has " + count + " rows. Run the import first.");
            }
            long[] ids = new long[(int) count];
            String[] values = new String[(int) count];
            int n = 0;
            try (ResultSet rows = statement.executeQuery(
                    "SELECT id, user_id, movie_id, rating, rated_at FROM perf_rating ORDER BY id")) {
                while (rows.next()) {
                    ids[n] = rows.getLong(1);
                    values[n] = rows.getInt(2) + "," + rows.getInt(3) + "," + rows.getInt(4) + "," + rows.getLong(5);
                    n++;
                }
            }
            if (n != count) {
                throw new IllegalStateException("Expected " + count + " rows and read " + n);
            }
            return new Rows(ids, values, (System.nanoTime() - started) / 1_000_000L);
        }
    }

    private static long[] targets(int count) {
        Random random = new Random(SEED);
        long[] ids = new long[WARMUP + MEASURED];
        for (int i = 0; i < ids.length; i++) {
            ids[i] = 1 + (long) (random.nextDouble() * count);
        }
        return ids;
    }

    private static long[] time(long[] targets, Lookup lookup) throws Exception {
        for (int i = 0; i < WARMUP; i++) {
            if (lookup.find(targets[i]) == null) {
                throw new IllegalStateException("Warm-up lookup missed id " + targets[i]);
            }
        }
        long[] nanos = new long[MEASURED];
        for (int i = 0; i < MEASURED; i++) {
            long id = targets[WARMUP + i];
            long started = System.nanoTime();
            String value = lookup.find(id);
            nanos[i] = System.nanoTime() - started;
            if (value == null) {
                throw new IllegalStateException("Lookup missed id " + id);
            }
        }
        return nanos;
    }

    private static long[] timeScan(Rows rows, long[] targets, PreparedStatement scan) throws SQLException {
        for (int i = 0; i < SCAN_WARMUP; i++) {
            queryByUserAndMovie(rows, targets[i], scan);
        }
        long[] nanos = new long[SCAN_MEASURED];
        for (int i = 0; i < SCAN_MEASURED; i++) {
            long id = targets[WARMUP + i];
            int index = binary(rows.ids, id);
            String[] parts = rows.values[index].split(",");
            int userId = Integer.parseInt(parts[0]);
            int movieId = Integer.parseInt(parts[1]);
            long started = System.nanoTime();
            scan.setInt(1, userId);
            scan.setInt(2, movieId);
            String value;
            try (ResultSet found = scan.executeQuery()) {
                value = found.next()
                        ? found.getInt(1) + "," + found.getInt(2) + "," + found.getInt(3) + "," + found.getLong(4)
                        : null;
            }
            nanos[i] = System.nanoTime() - started;
            if (value == null || !value.equals(rows.values[index])) {
                throw new IllegalStateException("Table scan missed id " + id);
            }
        }
        return nanos;
    }

    private static void queryByUserAndMovie(Rows rows, long id, PreparedStatement scan) throws SQLException {
        int index = binary(rows.ids, id);
        String[] parts = rows.values[index].split(",");
        scan.setInt(1, Integer.parseInt(parts[0]));
        scan.setInt(2, Integer.parseInt(parts[1]));
        try (ResultSet found = scan.executeQuery()) {
            if (!found.next()) {
                throw new IllegalStateException("Table scan missed id " + id);
            }
        }
    }

    private static void report(String name, long[] nanos) {
        long[] sorted = nanos.clone();
        Arrays.sort(sorted);
        long total = 0;
        for (long value : nanos) {
            total += value;
        }
        double avgUs = (total / (double) nanos.length) / 1_000.0;
        PerfLog.info(String.format(Locale.US,
                "%-22s  n=%d  avg=%10.1f us  p50=%10.1f us  p95=%10.1f us  min=%10.1f us  max=%10.1f us  total=%8.1f ms",
                name,
                nanos.length,
                avgUs,
                sorted[sorted.length / 2] / 1_000.0,
                sorted[(int) Math.ceil(sorted.length * 0.95) - 1] / 1_000.0,
                sorted[0] / 1_000.0,
                sorted[sorted.length - 1] / 1_000.0,
                total / 1_000_000.0));
    }

    private static int linear(long[] ids, long target) {
        for (int i = 0; i < ids.length; i++) {
            if (ids[i] == target) {
                return i;
            }
        }
        return -1;
    }

    private static int binary(long[] ids, long target) {
        int low = 0;
        int high = ids.length - 1;
        while (low <= high) {
            int mid = (low + high) >>> 1;
            long value = ids[mid];
            if (value == target) {
                return mid;
            }
            if (value < target) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return -1;
    }

    @FunctionalInterface
    private interface Lookup {
        String find(long id) throws Exception;
    }

    private record Rows(long[] ids, String[] values, long loadMillis) {
        int count() {
            return ids.length;
        }
    }
}
