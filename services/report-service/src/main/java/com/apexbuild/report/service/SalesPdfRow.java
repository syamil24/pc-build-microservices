package com.apexbuild.report.service;

public class SalesPdfRow {

    private final String categoryCode;
    private final String sku;
    private final String productName;
    private final Integer quantity;
    private final String revenueLabel;

    public SalesPdfRow(String categoryCode, String sku, String productName, Integer quantity, String revenueLabel) {
        this.categoryCode = categoryCode;
        this.sku = sku;
        this.productName = productName;
        this.quantity = quantity;
        this.revenueLabel = revenueLabel;
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

    public Integer getQuantity() {
        return quantity;
    }

    public String getRevenueLabel() {
        return revenueLabel;
    }
}
