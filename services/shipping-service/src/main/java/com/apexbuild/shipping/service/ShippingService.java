package com.apexbuild.shipping.service;

import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import com.apexbuild.common.messaging.KafkaTopics;
import com.apexbuild.shipping.domain.Shipment;
import com.apexbuild.shipping.domain.ShipmentEvent;
import com.apexbuild.shipping.domain.ShipmentFlow;
import com.apexbuild.shipping.repo.ShipmentEventRepository;
import com.apexbuild.shipping.repo.ShipmentRepository;
import com.apexbuild.web.messaging.EventPublisher;
import com.apexbuild.web.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ShippingService {

    private final ShipmentRepository shipments;
    private final ShipmentEventRepository events;
    private final EventPublisher publisher;

    public ShippingService(ShipmentRepository shipments, ShipmentEventRepository events, EventPublisher publisher) {
        this.shipments = shipments;
        this.events = events;
        this.publisher = publisher;
    }

    @Transactional
    public void open(UUID orderId, UUID userId) {
        if (shipments.findByOrderId(orderId).isPresent()) {
            return;
        }
        Shipment shipment = shipments.save(Shipment.open(orderId, userId));
        events.save(ShipmentEvent.of(shipment.getId(), shipment.getStatus()));
        publish(shipment);
    }

    @Transactional
    public void advanceAll() {
        for (Shipment shipment : shipments.findAll()) {
            if (ShipmentFlow.terminal(shipment.getStatus())) {
                continue;
            }
            shipment.setStatus(ShipmentFlow.next(shipment.getStatus()));
            events.save(ShipmentEvent.of(shipment.getId(), shipment.getStatus()));
            publish(shipment);
        }
    }

    public ShipmentView byOrder(UUID orderId) {
        Shipment shipment = shipments.findByOrderId(orderId)
                .orElseThrow(() -> new ApexException(ErrorCode.NOT_FOUND, "Shipment not found"));
        if (!shipment.getUserId().equals(CurrentUser.id()) && !"ADMIN".equals(CurrentUser.require().role())) {
            throw new ApexException(ErrorCode.FORBIDDEN, "Shipment belongs to another customer");
        }
        return view(shipment);
    }

    private void publish(Shipment shipment) {
        publisher.publish(KafkaTopics.SHIPPING_UPDATED, shipment.getOrderId().toString(), Map.of(
                "orderId", shipment.getOrderId().toString(),
                "status", shipment.getStatus(),
                "trackingNumber", shipment.getTrackingNumber()));
    }

    private ShipmentView view(Shipment shipment) {
        List<EventView> timeline = events.findByShipmentIdOrderByOccurredAtAsc(shipment.getId()).stream()
                .map(event -> new EventView(event.getStatus(), event.getMessage(), event.getOccurredAt().toString()))
                .toList();
        return new ShipmentView(shipment.getId(), shipment.getOrderId(), shipment.getTrackingNumber(), shipment.getStatus(),
                shipment.getCarrierName(), timeline);
    }

    public record EventView(String status, String message, String occurredAt) {
    }

    public record ShipmentView(UUID id, UUID orderId, String trackingNumber, String status, String carrier, List<EventView> events) {
    }
}
