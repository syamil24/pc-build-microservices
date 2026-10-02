package com.apexbuild.shipping.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ShipmentFlowTest {

    @Test
    void walksTheEmulatedRoute() {
        assertEquals("PICKED", ShipmentFlow.next("CREATED"));
        assertEquals("DELIVERED", ShipmentFlow.next("OUT_FOR_DELIVERY"));
        assertEquals("DELIVERED", ShipmentFlow.next("DELIVERED"));
        assertTrue(ShipmentFlow.terminal("DELIVERED"));
    }
}
