package com.apexbuild.report.repo;

import com.apexbuild.report.domain.SalesFact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface SalesFactRepository extends JpaRepository<SalesFact, UUID> {

    boolean existsByOrderIdAndLineNo(UUID orderId, int lineNo);

    @Query("""
            select f from SalesFact f
            where f.paidOn >= :from and f.paidOn < :to
              and (:category is null or f.categoryCode = :category)
            """)
    List<SalesFact> findForReport(@Param("from") LocalDate from, @Param("to") LocalDate to, @Param("category") String category);
}
