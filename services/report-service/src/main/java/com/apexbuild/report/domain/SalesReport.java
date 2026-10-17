package com.apexbuild.report.domain;

import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;

import java.time.DateTimeException;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;

public final class SalesReport {

    private SalesReport() {
    }

    public record Fact(UUID orderId, String categoryCode, String sku, String productName, int quantity, int lineTotalCents) {
    }

    public record Row(String categoryCode, String sku, String productName, int quantity, int revenueCents) {
    }

    public record Summary(String month, String category, int orderCount, int unitCount, int totalCents, List<Row> rows) {
    }

    public static YearMonth parseMonth(String month) {
        if (month == null || !month.matches("\\d{4}-\\d{2}")) {
            throw new ApexException(ErrorCode.VALIDATION_ERROR, "Month must look like 2026-10");
        }
        try {
            return YearMonth.parse(month);
        } catch (DateTimeException ex) {
            throw new ApexException(ErrorCode.VALIDATION_ERROR, "Month must look like 2026-10");
        }
    }

    public static Summary summarize(String month, String category, List<Fact> facts) {
        String label = category == null || category.isBlank() ? "ALL" : category;
        LinkedHashMap<String, Row> grouped = new LinkedHashMap<>();
        int units = 0;
        int total = 0;
        List<UUID> orders = new ArrayList<>();
        for (Fact fact : facts) {
            units += fact.quantity();
            total = Math.addExact(total, fact.lineTotalCents());
            if (!orders.contains(fact.orderId())) {
                orders.add(fact.orderId());
            }
            grouped.merge(fact.sku(), new Row(fact.categoryCode(), fact.sku(), fact.productName(), fact.quantity(), fact.lineTotalCents()),
                    (left, right) -> new Row(left.categoryCode(), left.sku(), left.productName(),
                            left.quantity() + right.quantity(), left.revenueCents() + right.revenueCents()));
        }
        List<Row> rows = grouped.values().stream()
                .sorted(Comparator.comparing(Row::categoryCode).thenComparing(Row::productName))
                .toList();
        return new Summary(month, label, orders.size(), units, total, rows);
    }

    public static String ringgit(int cents) {
        int ringgit = cents / 100;
        int sen = Math.abs(cents % 100);
        return "RM " + ringgit + "." + (sen < 10 ? "0" : "") + sen;
    }
}
