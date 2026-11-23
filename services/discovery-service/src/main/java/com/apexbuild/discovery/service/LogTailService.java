package com.apexbuild.discovery.service;

import com.apexbuild.discovery.web.LogFileView;
import com.apexbuild.discovery.web.LogTailView;

import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Tails the service log files that logback writes next to this process. Clients poll with the
 * byte offset from the previous response, so a poll reads only the bytes appended since then and
 * never the whole file. The endpoint is stateless: a partial trailing line is withheld until its
 * newline arrives, and rotation (offset beyond the current size) is reported so the client can
 * clear its view.
 */
@Service
public class LogTailService {

    private static final Pattern SAFE_NAME = Pattern.compile("[A-Za-z0-9._-]+\\.log");
    private static final int READ_LIMIT_BYTES = 262_144;
    private static final int BACKFILL_BYTES = 131_072;
    private static final int LINE_LIMIT = 400;

    private final Path logsDir;

    public LogTailService(@Value("${apex.logs-dir:logs}") String logsDir) {
        this.logsDir = Path.of(logsDir);
    }

    public List<LogFileView> files() throws IOException {
        if (!Files.isDirectory(logsDir)) {
            return List.of();
        }
        try (Stream<Path> entries = Files.list(logsDir)) {
            List<LogFileView> views = new ArrayList<>();
            for (Path path : entries.filter(Files::isRegularFile).toList()) {
                String name = path.getFileName().toString();
                if (!SAFE_NAME.matcher(name).matches()) {
                    continue;
                }
                views.add(new LogFileView(name, Files.size(path), Files.getLastModifiedTime(path).toInstant()));
            }
            views.sort(Comparator.comparing(LogFileView::name));
            return views;
        }
    }

    /**
     * @param offset byte offset of the previous poll, or a negative value to start from the tail
     * @throws IllegalArgumentException when the file name is unsafe or unknown
     */
    public LogTailView tail(String file, long offset) throws IOException {
        Path path = resolve(file);
        long size = Files.size(path);
        boolean reset = false;
        long start = offset;
        if (start < 0) {
            start = Math.max(0, size - BACKFILL_BYTES);
        } else if (start > size) {
            // The log rotated and the new file is shorter: restart the client view from the top.
            start = 0;
            reset = true;
        }
        if (start == size) {
            return new LogTailView(file, List.of(), size, size, false, reset);
        }

        int read = (int) Math.min(READ_LIMIT_BYTES, size - start);
        byte[] chunk = new byte[read];
        try (RandomAccessFile input = new RandomAccessFile(path.toFile(), "r")) {
            input.seek(start);
            int filled = 0;
            while (filled < read) {
                int taken = input.read(chunk, filled, read - filled);
                if (taken < 0) {
                    break;
                }
                filled += taken;
            }
            if (filled == 0) {
                return new LogTailView(file, List.of(), size, size, false, reset);
            }
            return decode(file, size, start, chunk, filled, offset < 0, reset);
        }
    }

    private LogTailView decode(String file, long size, long start, byte[] chunk, int length, boolean backfill,
                               boolean reset) {
        List<long[]> lineSpans = new ArrayList<>();
        long nextOffset = start;
        for (int i = 0; i < length; i++) {
            if (chunk[i] == '\n') {
                lineSpans.add(new long[] { nextOffset, start + i });
                nextOffset = start + i + 1;
            }
        }
        boolean truncated = false;
        if (lineSpans.isEmpty()) {
            // A full read with no newline (a stuck writer or a non-log file). Skip the chunk
            // instead of re-reading it on every poll.
            if (length == READ_LIMIT_BYTES) {
                return new LogTailView(file, List.of(), start + length, size, true, reset);
            }
            return new LogTailView(file, List.of(), start, size, false, reset);
        }
        if (backfill && start > 0) {
            // The first span is a partial line cut by the backfill window; drop it.
            lineSpans.remove(0);
        }
        List<String> lines = new ArrayList<>(lineSpans.size());
        for (long[] span : lineSpans) {
            int end = (int) (span[1] - start);
            if (end > 0 && chunk[end - 1] == '\r') {
                end--;
            }
            lines.add(new String(chunk, (int) (span[0] - start), end - (int) (span[0] - start), StandardCharsets.UTF_8));
        }
        if (lines.size() > LINE_LIMIT) {
            long[] keptFrom = lineSpans.get(lineSpans.size() - LINE_LIMIT);
            nextOffset = keptFrom[0];
            lines = new ArrayList<>(lines.subList(lines.size() - LINE_LIMIT, lines.size()));
            truncated = true;
        }
        return new LogTailView(file, lines, nextOffset, size, truncated, reset);
    }

    private Path resolve(String file) {
        if (file == null || !SAFE_NAME.matcher(file).matches()) {
            throw new IllegalArgumentException("Invalid log file name");
        }
        Path path = logsDir.resolve(file).normalize();
        if (!path.getParent().equals(logsDir.normalize())) {
            throw new IllegalArgumentException("Invalid log file name");
        }
        if (!Files.isRegularFile(path)) {
            throw new IllegalArgumentException("Unknown log file");
        }
        return path;
    }
}
