package com.apexbuild.shipping.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ShippingTicker {

    private final ShippingService shipping;

    public ShippingTicker(ShippingService shipping) {
        this.shipping = shipping;
    }

    @Scheduled(fixedDelayString = "${apex.shipping-tick-ms:15000}")
    public void tick() {
        shipping.advanceAll();
    }
}
