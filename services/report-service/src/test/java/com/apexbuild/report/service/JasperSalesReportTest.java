package com.apexbuild.report.service;

import com.apexbuild.report.domain.SalesReport;
import com.apexbuild.report.domain.SalesReport.Row;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JasperSalesReportTest {

    @Test
    void rendersAPdfForOneProduct() {
        byte[] pdf = new JasperSalesReport().render(new SalesReport.Summary("2026-10", "GPU", 1, 2, 250000,
                List.of(new Row("GPU", "GPU-H70", "Helix H70", 2, 250000))));
        String header = new String(pdf, 0, 5, StandardCharsets.US_ASCII);
        assertEquals("%PDF-", header);
        assertTrue(pdf.length > 400);
    }
}
