package com.apexbuild.shipping.repo;

import com.apexbuild.shipping.domain.ShipmentEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ShipmentEventRepository extends JpaRepository<ShipmentEvent, UUID> {
    List<ShipmentEvent> findByShipmentIdOrderByOccurredAtAsc(UUID shipmentId);
}
