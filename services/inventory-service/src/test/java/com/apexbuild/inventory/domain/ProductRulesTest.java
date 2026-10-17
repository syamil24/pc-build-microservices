package com.apexbuild.inventory.domain;

import com.apexbuild.common.error.ApexException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProductRulesTest {

    @Test
    void rejectsANonPositivePrice() {
        ApexException ex = assertThrows(ApexException.class,
                () -> ProductRules.check("GPU-1", "Card", "GPU", "NVIDIA", "Fast", 0, 1, 120));
        assertEquals("Price must be greater than zero", ex.getMessage());
    }

    @Test
    void acceptsAShelfProduct() {
        ProductRules.check("GPU-1", "Card", "GPU", "NVIDIA", "Fast", 100, 0, 0);
    }
}
