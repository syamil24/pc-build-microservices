package com.apexbuild.order.service;

import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import com.apexbuild.order.client.Downstream;
import com.apexbuild.order.domain.Cart;
import com.apexbuild.order.domain.CartItem;
import com.apexbuild.order.domain.CustomerOrder;
import com.apexbuild.order.domain.OrderLine;
import com.apexbuild.order.repo.CartItemRepository;
import com.apexbuild.order.repo.CartRepository;
import com.apexbuild.order.repo.CustomerOrderRepository;
import com.apexbuild.order.repo.OrderLineRepository;
import com.apexbuild.order.web.OrderDtos.OrderLineResponse;
import com.apexbuild.order.web.OrderDtos.OrderResponse;
import com.apexbuild.web.security.CurrentUser;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CheckoutService {

    private final CartRepository carts;
    private final CartItemRepository cartItems;
    private final CustomerOrderRepository orders;
    private final OrderLineRepository orderLines;
    private final Downstream downstream;

    public CheckoutService(CartRepository carts, CartItemRepository cartItems, CustomerOrderRepository orders,
                           OrderLineRepository orderLines, Downstream downstream) {
        this.carts = carts;
        this.cartItems = cartItems;
        this.orders = orders;
        this.orderLines = orderLines;
        this.downstream = downstream;
    }

    @Transactional
    public OrderResponse checkout(UUID addressId) {
        var user = CurrentUser.require();
        Cart cart = carts.findByUserId(user.userId())
                .orElseThrow(() -> new ApexException(ErrorCode.CONFLICT, "Cart is empty"));
        List<CartItem> items = cartItems.findByCartId(cart.getId());
        if (items.isEmpty()) {
            throw new ApexException(ErrorCode.CONFLICT, "Cart is empty");
        }
        List<Map<String, Object>> quoteLines = items.stream()
                .map(item -> Map.<String, Object>of("productId", item.getProductId(), "quantity", item.getQuantity()))
                .toList();
        JsonNode quote = downstream.quote(quoteLines);
        if (!quote.get("ok").asBoolean()) {
            throw new ApexException(ErrorCode.CONFLICT, "This build is not compatible. Review the builder warnings.");
        }
        JsonNode address = downstream.address(user.userId(), addressId);
        int total = quote.get("totalCents").asInt();
        CustomerOrder order = orders.save(CustomerOrder.create(user.userId(), total, address.get("snapshot").asText()));
        Map<UUID, UUID> buildByProduct = new HashMap<>();
        items.forEach(item -> buildByProduct.put(item.getProductId(), item.getBuildId()));
        for (JsonNode line : quote.get("lines")) {
            UUID productId = UUID.fromString(line.get("productId").asText());
            orderLines.save(OrderLine.from(order.getId(), productId, line.get("name").asText(),
                    line.get("unitPriceCents").asInt(), line.get("quantity").asInt(), buildByProduct.get(productId)));
        }
        List<Map<String, Object>> reserveLines = new ArrayList<>();
        List<Map<String, Object>> chargeLines = new ArrayList<>();
        for (JsonNode line : quote.get("lines")) {
            reserveLines.add(Map.of("productId", line.get("productId").asText(), "quantity", line.get("quantity").asInt()));
            chargeLines.add(Map.of("name", line.get("name").asText(), "unitPriceCents", line.get("unitPriceCents").asInt(),
                    "quantity", line.get("quantity").asInt()));
        }
        try {
            downstream.reserve(order.getId(), reserveLines);
            JsonNode payment = downstream.charge(Map.of(
                    "orderId", order.getId().toString(),
                    "userId", user.userId().toString(),
                    "email", user.email(),
                    "amountCents", total,
                    "lines", chargeLines));
            order.setPaymentId(UUID.fromString(payment.get("paymentId").asText()));
            order.setCheckoutUrl(payment.get("checkoutUrl").asText());
            order.setStatus("AWAITING_PAYMENT");
            orders.save(order);
            cartItems.deleteByCartId(cart.getId());
            return toResponse(order);
        } catch (RuntimeException ex) {
            downstream.release(order.getId());
            order.setStatus("CANCELLED");
            orders.save(order);
            throw ex;
        }
    }

    public List<OrderResponse> mine() {
        return orders.findByUserIdOrderByCreatedAtDesc(CurrentUser.id()).stream().map(this::toResponse).toList();
    }

    public OrderResponse get(UUID id) {
        CustomerOrder order = orders.findById(id)
                .filter(found -> found.getUserId().equals(CurrentUser.id()))
                .orElseThrow(() -> new ApexException(ErrorCode.NOT_FOUND, "Order not found"));
        return toResponse(order);
    }

    @Transactional
    public void markPaid(UUID orderId) {
        orders.findById(orderId).ifPresent(order -> {
            if ("PAID".equals(order.getStatus()) || "FULFILLED".equals(order.getStatus())) {
                return;
            }
            order.setStatus("PAID");
            downstream.confirmReservation(orderId);
        });
    }

    @Transactional
    public void markFailed(UUID orderId) {
        orders.findById(orderId).ifPresent(order -> {
            if ("PAID".equals(order.getStatus()) || "FULFILLED".equals(order.getStatus())) {
                return;
            }
            order.setStatus("PAYMENT_FAILED");
            downstream.release(orderId);
        });
    }

    @Transactional
    public void markFulfilled(UUID orderId) {
        orders.findById(orderId).ifPresent(order -> {
            if ("PAID".equals(order.getStatus())) {
                order.setStatus("FULFILLED");
            }
        });
    }

    private OrderResponse toResponse(CustomerOrder order) {
        List<OrderLineResponse> lines = orderLines.findByOrderId(order.getId()).stream()
                .map(line -> new OrderLineResponse(line.getProductId(), line.getProductName(), line.getUnitPriceCents(),
                        line.getQuantity(), line.getLineTotalCents(), line.getBuildId()))
                .toList();
        return new OrderResponse(order.getId(), order.getStatus(), order.getCurrency(), order.getTotalCents(),
                order.getAddressSnapshot(), order.getCheckoutUrl(), order.getPaymentId(), order.getCreatedAt(), lines);
    }
}
