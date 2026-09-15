package com.apexbuild.inventory.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "products")
public class Product {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String sku;

    @Column(nullable = false)
    private String name;

    @Column(name = "category_code", nullable = false)
    private String categoryCode;

    @Column(nullable = false)
    private String brand;

    @Column(nullable = false)
    private String description;

    @Column(name = "price_cents", nullable = false)
    private int priceCents;

    @Column(nullable = false)
    private int stock;

    @Column(name = "image_hue", nullable = false)
    private int imageHue;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private Map<String, Object> specs;

    @Column(nullable = false)
    private boolean active = true;

    protected Product() {
    }

    public static Product create(UUID id, String sku, String name, String categoryCode, String brand, String description,
                                 int priceCents, int stock, int imageHue, Map<String, Object> specs) {
        Product product = new Product();
        product.id = id;
        product.sku = sku;
        product.name = name;
        product.categoryCode = categoryCode;
        product.brand = brand;
        product.description = description;
        product.priceCents = priceCents;
        product.stock = stock;
        product.imageHue = imageHue;
        product.specs = specs;
        return product;
    }

    public UUID getId() {
        return id;
    }

    public String getSku() {
        return sku;
    }

    public String getName() {
        return name;
    }

    public String getCategoryCode() {
        return categoryCode;
    }

    public String getBrand() {
        return brand;
    }

    public String getDescription() {
        return description;
    }

    public int getPriceCents() {
        return priceCents;
    }

    public int getStock() {
        return stock;
    }

    public int getImageHue() {
        return imageHue;
    }

    public Map<String, Object> getSpecs() {
        return specs;
    }

    public boolean isActive() {
        return active;
    }

    public void setStock(int stock) {
        this.stock = stock;
    }
}
