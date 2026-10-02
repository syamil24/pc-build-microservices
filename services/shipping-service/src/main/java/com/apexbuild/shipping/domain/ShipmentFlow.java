package com.apexbuild.shipping.domain;

import java.util.List;
import java.util.Map;

public final class ShipmentFlow {

    private static final List<String> STEPS = List.of(
            "CREATED", "PICKED", "PACKED", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED");

    private static final Map<String, String> MESSAGES = Map.of(
            "CREATED", "Shipment created at the Apex hub",
            "PICKED", "Picked from the warehouse shelf",
            "PACKED", "Packed and labeled",
            "SHIPPED", "Handed to Apex Courier",
            "IN_TRANSIT", "Moving between Apex hubs",
            "OUT_FOR_DELIVERY", "Out for delivery",
            "DELIVERED", "Delivered");

    private ShipmentFlow() {
    }

    public static String next(String current) {
        int index = STEPS.indexOf(current);
        if (index < 0 || index == STEPS.size() - 1) {
            return current;
        }
        return STEPS.get(index + 1);
    }

    public static String message(String status) {
        return MESSAGES.getOrDefault(status, status);
    }

    public static boolean terminal(String status) {
        return "DELIVERED".equals(status);
    }
}
