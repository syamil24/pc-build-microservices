package com.apexbuild.order.domain;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TotalsTest {

    @Test
    void multipliesAndSumsInCents() {
        assertEquals(199800, Totals.line(99900, 2));
        assertEquals(300, Totals.sum(List.of(100, 200)));
    }

    @Test
    void rejectsAZeroQuantity() {
        assertThrows(IllegalArgumentException.class, () -> Totals.line(100, 0));
    }
}
