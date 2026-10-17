package com.apexbuild.report.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "sales_facts")
public class SalesFact {

    @Id
    private UUID id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "line_no", nullable = false)
    private int lineNo;

    @Column(name = "paid_on", nullable = false)
    private LocalDate paidOn;

    @Column(name = "category_code", nullable = false)
    private String categoryCode;

    @Column(nullable = false)
    private String sku;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "unit_price_cents", nullable = false)
    private int unitPriceCents;

    @Column(name = "line_total_cents", nullable = false)
    private int lineTotalCents;

    protected SalesFact() {
    }

    public static SalesFact create(UUID orderId, int lineNo, LocalDate paidOn, String categoryCode, String sku,
                                   String productName, int quantity, int unitPriceCents, int lineTotalCents) {
        SalesFact fact = new SalesFact();
        fact.id = UUID.randomUUID();
        fact.orderId = orderId;
        fact.lineNo = lineNo;
        fact.paidOn = paidOn;
        fact.categoryCode = categoryCode;
        fact.sku = sku;
        fact.productName = productName;
        fact.quantity = quantity;
        fact.unitPriceCents = unitPriceCents;
        fact.lineTotalCents = lineTotalCents;
        return fact;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public String getCategoryCode() {
        return categoryCode;
    }

    public String getSku() {
        return sku;
    }

    public String getProductName() {
        return productName;
    }

    public int getQuantity() {
        return quantity;
    }

    public int getLineTotalCents() {
        return lineTotalCents;
    }
}
