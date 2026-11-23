package com.apexbuild.discovery.service;

import com.apexbuild.discovery.web.LogFileView;
import com.apexbuild.discovery.web.LogTailView;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LogTailServiceTest {

    @TempDir
    Path tempDir;

    private LogTailService service() {
        return new LogTailService(tempDir.toString());
    }

    private Path write(String name, String content) throws IOException {
        return Files.write(tempDir.resolve(name), content.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void listsOnlyPlainLogFilesSortedByName() throws IOException {
        write("alpha.log", "a\n");
        write("beta.log", "b\n");
        write("archive", "not a log\n");
        Files.createDirectories(tempDir.resolve("sub.log.d"));

        List<LogFileView> files = service().files();

        assertThat(files).extracting(LogFileView::name).containsExactly("alpha.log", "beta.log");
        assertThat(files.get(0).sizeBytes()).isEqualTo(2);
    }

    @Test
    void rejectsUnsafeFileNames() {
        LogTailService service = service();

        assertThatThrownBy(() -> service.tail("../outside.log", 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.tail("..\\outside.log", 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.tail("no-such.log", 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.tail(null, 0)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void backfillReturnsOnlyCompleteLinesAndWithholdsTheTail() throws IOException {
        write("app.log", "old line\n2026-11-23 one\n2026-11-23 two");

        LogTailView view = service().tail("app.log", -1);

        assertThat(view.lines()).containsExactly("old line", "2026-11-23 one");
        assertThat(view.nextOffset()).isEqualTo("old line\n2026-11-23 one\n".length());
        assertThat(view.reset()).isFalse();
    }

    @Test
    void largeBackfillDropsThePartialLeadingLine() throws IOException {
        StringBuilder content = new StringBuilder();
        content.append("x".repeat(131_100)).append('\n'); // longer than the backfill window
        content.append("first full line\nsecond full line\n");
        write("app.log", content.toString());

        LogTailView view = service().tail("app.log", -1);

        assertThat(view.lines()).containsExactly("first full line", "second full line");
        assertThat(view.nextOffset()).isEqualTo(content.length());
    }

    @Test
    void tailFromOffsetReturnsOnlyNewLines() throws IOException {
        String first = "first\n";
        write("app.log", first + "second\n");

        LogTailView view = service().tail("app.log", first.length());

        assertThat(view.lines()).containsExactly("second");
        assertThat(view.nextOffset()).isEqualTo((first + "second\n").length());
    }

    @Test
    void rotationBeyondFileSizeResetsToTheTop() throws IOException {
        write("app.log", "fresh start\n");

        LogTailView view = service().tail("app.log", 5_000);

        assertThat(view.reset()).isTrue();
        assertThat(view.lines()).containsExactly("fresh start");
        assertThat(view.nextOffset()).isEqualTo("fresh start\n".length());
    }

    @Test
    void withholdsPartialLineUntilItsNewlineArrives() throws IOException {
        Path file = write("app.log", "done\npartial");
        LogTailView view = service().tail("app.log", 0);
        assertThat(view.lines()).containsExactly("done");
        assertThat(view.nextOffset()).isEqualTo("done\n".length());

        Files.writeString(file, "done\npartial and complete\n", StandardCharsets.UTF_8);
        view = service().tail("app.log", view.nextOffset());
        assertThat(view.lines()).containsExactly("partial and complete");
    }

    @Test
    void capsReturnedLinesAndFlagsTruncation() throws IOException {
        StringBuilder content = new StringBuilder();
        for (int i = 0; i < 500; i++) {
            content.append("line-").append(i).append('\n');
        }
        write("app.log", content.toString());

        LogTailView view = service().tail("app.log", 0);

        assertThat(view.truncated()).isTrue();
        assertThat(view.lines()).hasSize(400);
        assertThat(view.lines().get(0)).isEqualTo("line-100");
        assertThat(view.nextOffset()).isEqualTo(content.substring(0, indexOfLine(content, 100)).length());
    }

    @Test
    void skipsNewlineFreeChunksInsteadOfReReadingForever() throws IOException {
        StringBuilder content = new StringBuilder();
        for (int i = 0; i < 300_000; i++) {
            content.append('x');
        }
        write("app.log", content.toString());

        LogTailView view = service().tail("app.log", 0);

        assertThat(view.lines()).isEmpty();
        assertThat(view.truncated()).isTrue();
        assertThat(view.nextOffset()).isEqualTo(262_144);
    }

    private int indexOfLine(StringBuilder content, int line) {
        int index = 0;
        for (int i = 0; i < line; i++) {
            index = content.indexOf("\n", index) + 1;
        }
        return index;
    }
}
