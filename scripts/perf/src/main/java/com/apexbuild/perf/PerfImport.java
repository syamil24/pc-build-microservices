package com.apexbuild.perf;

import org.postgresql.copy.CopyManager;
import org.postgresql.core.BaseConnection;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.Pipeline;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Properties;

public final class PerfImport {

    private static final String META_COUNT = "perf:meta:count";

    public static void main(String[] args) {
        try {
            PerfSettings settings = PerfSettings.load(args);
            PerfLog.info("MovieLens import. Same rows will be written to Postgres and Redis.");
            PerfLog.info("Postgres " + settings.dbHost + ":" + settings.dbPort + "/" + settings.dbName + " user=" + settings.dbUser);
            ensurePostgres(settings);
            DemoRedis.Endpoint redis = DemoRedis.prepare(settings);
            Path ratings = MovieLens.ratingsFile(settings);
            long expected = MovieLens.countRows(ratings);
            PerfLog.info(MovieLens.CITATION);
            PerfLog.info("Source rows " + expected);
            long started = System.nanoTime();
            boolean postgresLoaded = loadPostgres(settings, ratings, expected);
            boolean redisLoaded = loadRedis(settings, redis, ratings, expected);
            double seconds = (System.nanoTime() - started) / 1_000_000_000.0;
            PerfLog.info("Import finished in " + String.format(java.util.Locale.US, "%.1f", seconds) + "s"
                    + (postgresLoaded ? ", Postgres written" : ", Postgres already loaded")
                    + (redisLoaded ? ", Redis written" : ", Redis already loaded"));
            PerfLog.info("Next: scripts/perf-search.ps1 or scripts/perf-search.sh");
        } catch (IllegalArgumentException ex) {
            PerfLog.error(ex.getMessage());
            System.exit(2);
        } catch (SQLException ex) {
            PerfLog.error(postgresMessage(ex));
            System.exit(2);
        } catch (IOException | InterruptedException ex) {
            PerfLog.error(ex.getMessage());
            System.exit(ex instanceof InterruptedException ? 1 : 4);
        } catch (RuntimeException ex) {
            PerfLog.error(ex.getClass().getSimpleName() + ": " + ex.getMessage());
            System.exit(3);
        }
    }

    private static void ensurePostgres(PerfSettings settings) throws SQLException {
        try (Connection admin = open(settings, "postgres"); Statement statement = admin.createStatement()) {
            statement.execute("SELECT 1");
        } catch (SQLException ex) {
            throw postgresDown(settings, ex);
        }
        PerfLog.info("Postgres is accepting connections");
    }

    private static boolean loadPostgres(PerfSettings settings, Path ratings, long expected) throws SQLException, IOException {
        createDatabase(settings);
        try (Connection conn = open(settings, settings.dbName)) {
            conn.setAutoCommit(true);
            try (Statement statement = conn.createStatement()) {
                statement.execute("""
                        CREATE TABLE IF NOT EXISTS perf_rating (
                            id BIGINT PRIMARY KEY,
                            user_id INTEGER NOT NULL,
                            movie_id INTEGER NOT NULL,
                            rating SMALLINT NOT NULL,
                            rated_at BIGINT NOT NULL
                        )
                        """);
            }
            long existing = count(conn);
            if (existing == expected && !settings.reload) {
                PerfLog.info("Postgres already has all " + existing + " rows. Skipping the copy.");
                return false;
            }
            if (existing > 0) {
                PerfLog.warn("Postgres has " + existing + " rows and the file has " + expected + ". Replacing the table so both sides match.");
            }
            long started = System.nanoTime();
            conn.setAutoCommit(false);
            try (Statement statement = conn.createStatement()) {
                statement.execute("TRUNCATE perf_rating");
                CopyManager copy = new CopyManager(conn.unwrap(BaseConnection.class));
                long copied = copy.copyIn(
                        "COPY perf_rating (id, user_id, movie_id, rating, rated_at) FROM STDIN WITH (FORMAT csv)",
                        new CsvRatings(ratings));
                if (copied != expected) {
                    throw new SQLException("COPY wrote " + copied + " rows, expected " + expected);
                }
                conn.commit();
            } catch (SQLException | IOException | RuntimeException ex) {
                conn.rollback();
                throw ex;
            }
            long after = count(conn);
            if (after != expected) {
                throw new SQLException("Postgres count is " + after + " after COPY, expected " + expected);
            }
            PerfLog.info("Postgres COPY of " + after + " rows took " + millis(started) + " ms");
            return true;
        }
    }

    private static void createDatabase(PerfSettings settings) throws SQLException {
        try (Connection admin = open(settings, "postgres"); Statement statement = admin.createStatement()) {
            boolean exists;
            try (ResultSet found = statement.executeQuery(
                    "SELECT 1 FROM pg_database WHERE datname = '" + settings.dbName + "'")) {
                exists = found.next();
            }
            if (exists) {
                return;
            }
            statement.executeUpdate("CREATE DATABASE " + settings.dbName);
            PerfLog.info("Created database " + settings.dbName);
        }
    }

    private static boolean loadRedis(PerfSettings settings, DemoRedis.Endpoint endpoint, Path ratings, long expected)
            throws IOException {
        try (Jedis jedis = DemoRedis.open(endpoint)) {
            String meta = jedis.get(META_COUNT);
            String sample = jedis.get(key(1));
            String middle = jedis.get(key(expected / 2));
            String last = jedis.get(key(expected));
            if (!settings.reload && Long.toString(expected).equals(meta) && sample != null && middle != null && last != null) {
                PerfLog.info("Redis already has " + expected + " perf:rating keys. Skipping the load.");
                return false;
            }
            if (meta != null || sample != null) {
                PerfLog.warn("Redis perf data is missing or partial. Loading it again.");
            }
            long started = System.nanoTime();
            jedis.del(META_COUNT);
            long written = 0;
            try (BufferedReader reader = Files.newBufferedReader(ratings, StandardCharsets.UTF_8)) {
                Pipeline pipeline = jedis.pipelined();
                String line;
                long lineNo = 0;
                long id = 0;
                while ((line = reader.readLine()) != null) {
                    lineNo++;
                    if (line.isBlank()) {
                        continue;
                    }
                    int[] row = MovieLens.parse(line, lineNo);
                    id++;
                    pipeline.set(key(id), row[0] + "," + row[1] + "," + row[2] + "," + row[3]);
                    written++;
                    if (written % 2000 == 0) {
                        pipeline.sync();
                        pipeline = jedis.pipelined();
                    }
                    if (written % 100_000 == 0) {
                        PerfLog.info("Redis loaded " + written + " keys");
                    }
                }
                pipeline.sync();
            }
            if (written != expected) {
                throw new IOException("Redis received " + written + " keys, expected " + expected);
            }
            if (jedis.get(key(1)) == null || jedis.get(key(expected)) == null) {
                throw new IOException("Redis accepted the writes and then dropped them. Its memory cap is too small.");
            }
            jedis.set(META_COUNT, Long.toString(expected));
            PerfLog.info("Redis load of " + written + " keys took " + millis(started) + " ms");
            return true;
        }
    }

    static String key(long id) {
        return "perf:rating:" + id;
    }

    private static long count(Connection conn) throws SQLException {
        try (Statement statement = conn.createStatement(); ResultSet rows = statement.executeQuery("SELECT count(*) FROM perf_rating")) {
            rows.next();
            return rows.getLong(1);
        }
    }

    static Connection open(PerfSettings settings, String database) throws SQLException {
        Properties properties = new Properties();
        properties.setProperty("user", settings.dbUser);
        properties.setProperty("password", settings.dbPassword);
        return DriverManager.getConnection(settings.jdbc(database), properties);
    }

    private static SQLException postgresDown(PerfSettings settings, SQLException ex) {
        String state = ex.getSQLState() == null ? "" : ex.getSQLState();
        if ("28P01".equals(state)) {
            return new SQLException("Postgres rejected user " + settings.dbUser + ". Check DB_PASSWORD in .env.", ex);
        }
        return new SQLException("Postgres is not accepting connections at " + settings.dbHost + ":" + settings.dbPort
                + ". Start Postgres and rerun. " + ex.getMessage(), ex);
    }

    private static String postgresMessage(SQLException ex) {
        String message = ex.getMessage() == null ? "Postgres error" : ex.getMessage();
        return message.replace(System.lineSeparator(), " ");
    }

    private static long millis(long started) {
        return (System.nanoTime() - started) / 1_000_000L;
    }

    private static final class CsvRatings extends Reader {
        private final BufferedReader source;
        private String pending = "";
        private long lineNo;
        private long id;
        private boolean closed;

        private CsvRatings(Path ratings) throws IOException {
            this.source = Files.newBufferedReader(ratings, StandardCharsets.UTF_8);
        }

        @Override
        public int read(char[] buffer, int offset, int length) throws IOException {
            if (closed) {
                return -1;
            }
            int written = 0;
            while (written < length) {
                if (pending.isEmpty()) {
                    String line = source.readLine();
                    if (line == null) {
                        closed = true;
                        source.close();
                        return written == 0 ? -1 : written;
                    }
                    lineNo++;
                    if (line.isBlank()) {
                        continue;
                    }
                    int[] row = MovieLens.parse(line, lineNo);
                    id++;
                    pending = id + "," + row[0] + "," + row[1] + "," + row[2] + "," + row[3] + "\n";
                }
                int take = Math.min(length - written, pending.length());
                pending.getChars(0, take, buffer, offset + written);
                pending = pending.substring(take);
                written += take;
            }
            return written;
        }

        @Override
        public void close() throws IOException {
            closed = true;
            source.close();
        }
    }

}
