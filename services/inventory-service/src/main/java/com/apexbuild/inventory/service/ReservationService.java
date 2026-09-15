package com.apexbuild.inventory.service;

import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import com.apexbuild.inventory.domain.Product;
import com.apexbuild.inventory.domain.Reservation;
import com.apexbuild.inventory.domain.ReservationLine;
import com.apexbuild.inventory.repo.ProductRepository;
import com.apexbuild.inventory.repo.ReservationLineRepository;
import com.apexbuild.inventory.repo.ReservationRepository;
import com.apexbuild.inventory.web.CatalogDtos.LineRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ReservationService {

    private final ReservationRepository reservations;
    private final ReservationLineRepository lines;
    private final ProductRepository products;
    private final CatalogService catalog;

    public ReservationService(ReservationRepository reservations, ReservationLineRepository lines,
                              ProductRepository products, CatalogService catalog) {
        this.reservations = reservations;
        this.lines = lines;
        this.products = products;
        this.catalog = catalog;
    }

    @Transactional
    public void reserve(UUID orderId, List<LineRequest> requested) {
        if (reservations.findByOrderId(orderId).isPresent()) {
            return;
        }
        Reservation reservation = reservations.save(Reservation.hold(orderId));
        for (LineRequest line : requested) {
            Product product = products.lockById(line.productId())
                    .orElseThrow(() -> new ApexException(ErrorCode.NOT_FOUND, "Product not found"));
            if (product.getStock() < line.quantity()) {
                throw new ApexException(ErrorCode.CONFLICT, product.getName() + " does not have enough stock");
            }
            product.setStock(product.getStock() - line.quantity());
            lines.save(ReservationLine.of(reservation.getId(), product.getId(), line.quantity()));
        }
        catalog.evictCatalog();
    }

    @Transactional
    public void confirm(UUID orderId) {
        reservations.findByOrderId(orderId).ifPresent(reservation -> reservation.setStatus("CONFIRMED"));
    }

    @Transactional
    public void release(UUID orderId) {
        Reservation reservation = reservations.findByOrderId(orderId).orElse(null);
        if (reservation == null || "RELEASED".equals(reservation.getStatus())) {
            return;
        }
        for (ReservationLine line : lines.findByReservationId(reservation.getId())) {
            products.lockById(line.getProductId()).ifPresent(product ->
                    product.setStock(product.getStock() + line.getQuantity()));
        }
        reservation.setStatus("RELEASED");
        catalog.evictCatalog();
    }
}
