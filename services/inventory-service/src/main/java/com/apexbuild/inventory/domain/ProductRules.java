package com.apexbuild.inventory.domain;

import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;

public final class ProductRules {

    private ProductRules() {
    }

    public static void check(String sku, String name, String category, String brand, String description,
                             int priceCents, int stock, int imageHue) {
        if (sku == null || sku.isBlank() || sku.length() > 40) {
            throw new ApexException(ErrorCode.VALIDATION_ERROR, "SKU must be 1 to 40 characters");
        }
        if (name == null || name.isBlank() || name.length() > 160) {
            throw new ApexException(ErrorCode.VALIDATION_ERROR, "Name must be 1 to 160 characters");
        }
        if (category == null || category.isBlank()) {
            throw new ApexException(ErrorCode.VALIDATION_ERROR, "Choose a category");
        }
        if (brand == null || brand.isBlank() || brand.length() > 80) {
            throw new ApexException(ErrorCode.VALIDATION_ERROR, "Brand must be 1 to 80 characters");
        }
        if (description == null || description.isBlank()) {
            throw new ApexException(ErrorCode.VALIDATION_ERROR, "Description is required");
        }
        if (priceCents <= 0) {
            throw new ApexException(ErrorCode.VALIDATION_ERROR, "Price must be greater than zero");
        }
        if (stock < 0) {
            throw new ApexException(ErrorCode.VALIDATION_ERROR, "Stock cannot be negative");
        }
        if (imageHue < 0 || imageHue > 359) {
            throw new ApexException(ErrorCode.VALIDATION_ERROR, "Image hue must be from 0 to 359");
        }
    }
}
