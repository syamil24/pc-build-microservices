package com.apexbuild.order.repo;

import com.apexbuild.order.domain.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {
    List<CartItem> findByCartId(UUID cartId);

    void deleteByCartId(UUID cartId);
}
