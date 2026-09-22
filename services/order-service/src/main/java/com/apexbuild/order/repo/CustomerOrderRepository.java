package com.apexbuild.order.repo;

import com.apexbuild.order.domain.CustomerOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, UUID> {
    List<CustomerOrder> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
