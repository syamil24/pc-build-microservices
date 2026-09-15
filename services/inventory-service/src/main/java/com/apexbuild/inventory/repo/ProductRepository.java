package com.apexbuild.inventory.repo;

import com.apexbuild.inventory.domain.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> lockById(@Param("id") UUID id);

    @Query("""
            select p from Product p
            where p.active = true
              and (:category is null or p.categoryCode = :category)
              and (:minPrice is null or p.priceCents >= :minPrice)
              and (:maxPrice is null or p.priceCents <= :maxPrice)
              and (:q is null or lower(p.name) like lower(concat('%', :q, '%'))
                   or lower(p.brand) like lower(concat('%', :q, '%'))
                   or lower(p.sku) like lower(concat('%', :q, '%')))
            """)
    List<Product> search(@Param("category") String category, @Param("minPrice") Integer minPrice,
                         @Param("maxPrice") Integer maxPrice, @Param("q") String q);

    List<Product> findByCategoryCodeAndActiveTrue(String categoryCode);
}
