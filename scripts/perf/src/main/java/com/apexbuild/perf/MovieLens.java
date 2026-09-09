package com.apexbuild.perf;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

final class MovieLens {

    static final String SOURCE = "https://files.grouplens.org/datasets/movielens/ml-1m.zip";
    static final String CITATION = "MovieLens 1M ratings, GroupLens Research (https://grouplens.org/datasets/movielens/1m/)";

    private MovieLens() {
    }

    static Path ratingsFile(PerfSettings settings) throws IOException, InterruptedException {
        Path dir = settings.dataDir();
        Files.createDirectories(dir);
        Path ratings = dir.resolve("ratings.dat");
        if (Files.isRegularFile(ratings) && Files.size(ratings) > 10_000_000L) {
            PerfLog.info("Using the ratings file already downloaded at " + ratings);
            return ratings;
        }
        Path zip = dir.resolve("ml-1m.zip");
        if (!Files.isRegularFile(zip) || Files.size(zip) < 1_000_000L) {
            download(zip);
        } else {
            PerfLog.info("Using the zip already downloaded at " + zip);
        }
        extractRatings(zip, ratings);
        return ratings;
    }

    static long countRows(Path ratings) throws IOException {
        long rows = 0;
        try (BufferedReader reader = Files.newBufferedReader(ratings, StandardCharsets.UTF_8)) {
            String line;
            long lineNo = 0;
            while ((line = reader.readLine()) != null) {
                lineNo++;
                if (line.isBlank()) {
                    continue;
                }
                parse(line, lineNo);
                rows++;
            }
        }
        if (rows < 1_000_000L) {
            throw new IOException("Expected at least 1,000,000 ratings in " + ratings + " but found " + rows);
        }
        return rows;
    }

    static int[] parse(String line, long lineNo) {
        String[] parts = line.split("::");
        if (parts.length != 4) {
            throw new IllegalArgumentException("Line " + lineNo + " is not UserID::MovieID::Rating::Timestamp");
        }
        try {
            int userId = Integer.parseInt(parts[0]);
            int movieId = Integer.parseInt(parts[1]);
            int rating = Integer.parseInt(parts[2]);
            long ratedAt = Long.parseLong(parts[3]);
            if (userId < 1 || movieId < 1 || rating < 1 || rating > 5 || ratedAt < 0) {
                throw new NumberFormatException(line);
            }
            return new int[]{userId, movieId, rating, (int) ratedAt};
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Line " + lineNo + " has a value that is not a rating row");
        }
    }

    private static void download(Path zip) throws IOException, InterruptedException {
        PerfLog.info("Downloading " + CITATION);
        PerfLog.info("URL " + SOURCE);
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).followRedirects(HttpClient.Redirect.NORMAL).build();
        HttpRequest request = HttpRequest.newBuilder(URI.create(SOURCE)).timeout(Duration.ofMinutes(5)).GET().build();
        Path partial = zip.resolveSibling(zip.getFileName() + ".partial");
        Files.deleteIfExists(partial);
        HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() != 200) {
            throw new IOException("Download failed with HTTP " + response.statusCode() + " from " + SOURCE);
        }
        long bytes = 0;
        try (InputStream in = new BufferedInputStream(response.body()); OutputStream out = Files.newOutputStream(partial)) {
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = in.read(buffer)) >= 0) {
                out.write(buffer, 0, read);
                bytes += read;
            }
        }
        if (bytes < 1_000_000L) {
            Files.deleteIfExists(partial);
            throw new IOException("Download is only " + bytes + " bytes. The MovieLens file did not arrive.");
        }
        Files.move(partial, zip, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        PerfLog.info("Downloaded " + bytes + " bytes to " + zip);
    }

    private static void extractRatings(Path zip, Path ratings) throws IOException {
        Path partial = ratings.resolveSibling("ratings.dat.partial");
        Files.deleteIfExists(partial);
        boolean found = false;
        try (ZipInputStream zipIn = new ZipInputStream(Files.newInputStream(zip))) {
            ZipEntry entry;
            while ((entry = zipIn.getNextEntry()) != null) {
                String name = entry.getName().replace('\\', '/');
                if (entry.isDirectory() || !name.endsWith("ratings.dat") || name.contains("..")) {
                    continue;
                }
                try (OutputStream out = Files.newOutputStream(partial)) {
                    zipIn.transferTo(out);
                }
                found = true;
                break;
            }
        }
        if (!found || Files.size(partial) < 10_000_000L) {
            Files.deleteIfExists(partial);
            throw new IOException("ml-1m.zip does not contain a usable ratings.dat. Delete " + zip + " and rerun.");
        }
        Files.move(partial, ratings, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        PerfLog.info("Extracted ratings.dat (" + Files.size(ratings) + " bytes)");
    }
}
