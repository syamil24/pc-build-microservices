package com.apexbuild.order.service;

import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import com.apexbuild.order.client.Downstream;
import com.apexbuild.order.domain.Cart;
import com.apexbuild.order.domain.CartItem;
import com.apexbuild.order.domain.Totals;
import com.apexbuild.order.repo.CartItemRepository;
import com.apexbuild.order.repo.CartRepository;
import com.apexbuild.order.web.OrderDtos.AddItemRequest;
import com.apexbuild.order.web.OrderDtos.CartLine;
import com.apexbuild.order.web.OrderDtos.CartResponse;
import com.apexbuild.web.security.CurrentUser;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class CartService {

    private final CartRepository carts;
    private final CartItemRepository items;
    private final Downstream downstream;

    public CartService(CartRepository carts, CartItemRepository items, Downstream downstream) {
        this.carts = carts;
        this.items = items;
        this.downstream = downstream;
    }

    public CartResponse get() {
        Cart cart = carts.findByUserId(CurrentUser.id()).orElse(null);
        if (cart == null) {
            return new CartResponse(null, List.of(), 0);
        }
        return view(cart);
    }

    @Transactional
    public CartResponse add(AddItemRequest request) {
        if (request.quantity() < 1) {
            throw new ApexException(ErrorCode.VALIDATION_ERROR, "Quantity must be at least 1");
        }
        Cart cart = carts.findByUserId(CurrentUser.id()).orElseGet(() -> carts.save(Cart.forUser(CurrentUser.id())));
        JsonNode product = downstream.product(request.productId());
        CartItem existing = items.findByCartId(cart.getId()).stream()
                .filter(item -> item.getProductId().equals(request.productId()) && Objects.equals(item.getBuildId(), request.buildId()))
                .findFirst()
                .orElse(null);
        if (existing == null) {
            items.save(CartItem.create(cart.getId(), request.productId(), product.get("name").asText(),
                    product.get("priceCents").asInt(), request.quantity(), request.buildId()));
        } else {
            existing.addQuantity(request.quantity());
        }
        cart.touch();
        return view(cart);
    }

    @Transactional
    public CartResponse addBatch(UUID buildId, List<AddItemRequest> lines) {
        CartResponse current = null;
        for (AddItemRequest line : lines) {
            current = add(new AddItemRequest(line.productId(), line.quantity(), buildId));
        }
        return current;
    }

    @Transactional
    public CartResponse remove(UUID itemId) {
        Cart cart = carts.findByUserId(CurrentUser.id())
                .orElseThrow(() -> new ApexException(ErrorCode.NOT_FOUND, "Cart is empty"));
        CartItem item = items.findById(itemId)
                .filter(found -> found.getCartId().equals(cart.getId()))
                .orElseThrow(() -> new ApexException(ErrorCode.NOT_FOUND, "Cart item not found"));
        items.delete(item);
        cart.touch();
        return view(cart);
    }

    private CartResponse view(Cart cart) {
        List<CartLine> lines = items.findByCartId(cart.getId()).stream()
                .map(item -> new CartLine(item.getId(), item.getProductId(), item.getProductName(), item.getUnitPriceCents(),
                        item.getQuantity(), item.getBuildId(), Totals.line(item.getUnitPriceCents(), item.getQuantity())))
                .toList();
        int total = Totals.sum(lines.stream().map(CartLine::lineTotalCents).toList());
        return new CartResponse(cart.getId(), lines, total);
    }
}
