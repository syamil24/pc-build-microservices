package com.apexbuild.discovery.web;

import com.apexbuild.common.api.ApiError;
import com.apexbuild.common.api.ApiResponse;
import com.apexbuild.discovery.service.LogTailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/platform/logs")
public class LogViewController {

    private final LogTailService tailService;

    public LogViewController(LogTailService tailService) {
        this.tailService = tailService;
    }

    @GetMapping("/files")
    ResponseEntity<ApiResponse<List<LogFileView>>> files() throws IOException {
        return ResponseEntity.ok(ApiResponse.ok(tailService.files()));
    }

    @GetMapping("/tail")
    ResponseEntity<ApiResponse<LogTailView>> tail(
            @RequestParam("file") String file,
            @RequestParam(value = "offset", defaultValue = "-1") long offset) {
        try {
            return ResponseEntity.ok(ApiResponse.ok(tailService.tail(file, offset)));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, null, ApiError.of("BAD_REQUEST", ex.getMessage(), null, null)));
        } catch (IOException ex) {
            return ResponseEntity.internalServerError()
                    .body(new ApiResponse<>(false, null, ApiError.of("IO_ERROR", "Could not read the log file", null, null)));
        }
    }
}
