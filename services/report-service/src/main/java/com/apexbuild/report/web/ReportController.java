package com.apexbuild.report.web;

import com.apexbuild.common.api.ApiResponse;
import com.apexbuild.report.domain.SalesReport;
import com.apexbuild.report.service.SalesReportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final SalesReportService reports;

    public ReportController(SalesReportService reports) {
        this.reports = reports;
    }

    @GetMapping("/sales")
    ResponseEntity<ApiResponse<SalesReport.Summary>> sales(@RequestParam String month,
                                                           @RequestParam(required = false) String category) {
        return ResponseEntity.ok(ApiResponse.ok(reports.summary(month, category)));
    }

    @GetMapping(value = "/sales.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    ResponseEntity<byte[]> pdf(@RequestParam String month, @RequestParam(required = false) String category) {
        String file = "apex-sales-" + month + (category == null || category.isBlank() ? "" : "-" + category) + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(reports.pdf(month, category));
    }
}
