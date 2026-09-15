package com.apexbuild.inventory.repo;

import com.apexbuild.inventory.domain.ReservationLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReservationLineRepository extends JpaRepository<ReservationLine, UUID> {

    List<ReservationLine> findByReservationId(UUID reservationId);
}
