package com.apexbuild.order.domain;

import java.util.List;

public final class Totals {

    private Totals() {
    }

    public static int line(int unitPriceCents, int quantity) {
        if (quantity < 1) {
            throw new IllegalArgumentException("quantity");
        }
        return Math.multiplyExact(unitPriceCents, quantity);
    }

    public static int sum(List<Integer> lineTotals) {
        int total = 0;
        for (int line : lineTotals) {
            total = Math.addExact(total, line);
        }
        return total;
    }
}
