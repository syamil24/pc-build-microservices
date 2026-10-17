package com.apexbuild.report.service;

import com.apexbuild.report.client.OrderSalesClient;
import com.apexbuild.report.domain.SalesFact;
import com.apexbuild.report.domain.SalesReport;
import com.apexbuild.report.domain.SalesReport.Fact;
import com.apexbuild.report.domain.SalesReport.Summary;
import com.apexbuild.report.repo.SalesFactRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.UUID;

@Service
public class SalesReportService {

    private static final ZoneId KUALA_LUMPUR = ZoneId.of("Asia/Kuala_Lumpur");

    private final SalesFactRepository facts;
    private final OrderSalesClient orders;
    private final JasperSalesReport jasper;

    public SalesReportService(SalesFactRepository facts, OrderSalesClient orders, JasperSalesReport jasper) {
        this.facts = facts;
        this.orders = orders;
        this.jasper = jasper;
    }

    public Summary summary(String month, String category) {
        return SalesReport.summarize(month, category, load(month, category));
    }

    public byte[] pdf(String month, String category) {
        return jasper.render(summary(month, category));
    }

    @Transactional
    public void recordPaidOrder(UUID orderId) {
        JsonNode order = orders.order(orderId);
        JsonNode lines = order.get("lines");
        if (lines == null || !lines.isArray()) {
            return;
        }
        LocalDate paidOn = LocalDate.now(KUALA_LUMPUR);
        for (JsonNode line : lines) {
            int lineNo = line.get("lineNo").asInt();
            if (facts.existsByOrderIdAndLineNo(orderId, lineNo)) {
                continue;
            }
            int quantity = line.get("quantity").asInt();
            int unitPrice = line.get("unitPriceCents").asInt();
            int lineTotal = line.get("lineTotalCents").asInt();
            if (quantity < 1 || unitPrice < 1 || lineTotal < 1) {
                continue;
            }
            String sku = text(line, "sku");
            String category = text(line, "category");
            facts.save(SalesFact.create(orderId, lineNo, paidOn, category == null ? "UNCATEGORIZED" : category,
                    sku == null ? "UNKNOWN" : sku, text(line, "name"), quantity, unitPrice, lineTotal));
        }
    }

    private java.util.List<Fact> load(String month, String category) {
        YearMonth parsed = SalesReport.parseMonth(month);
        String categoryCode = category == null || category.isBlank() ? null : category.trim();
        return facts.findForReport(parsed.atDay(1), parsed.plusMonths(1).atDay(1), categoryCode).stream()
                .map(fact -> new Fact(fact.getOrderId(), fact.getCategoryCode(), fact.getSku(), fact.getProductName(),
                        fact.getQuantity(), fact.getLineTotalCents()))
                .toList();
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return text == null || text.isBlank() ? null : text;
    }
}
