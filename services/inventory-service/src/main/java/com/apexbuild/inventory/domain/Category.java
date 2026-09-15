package com.apexbuild.inventory.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "categories")
public class Category {

    @Id
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "builder_slot", nullable = false)
    private boolean builderSlot;

    protected Category() {
    }

    public static Category create(String code, String name, boolean builderSlot) {
        Category category = new Category();
        category.code = code;
        category.name = name;
        category.builderSlot = builderSlot;
        return category;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public boolean isBuilderSlot() {
        return builderSlot;
    }
}
