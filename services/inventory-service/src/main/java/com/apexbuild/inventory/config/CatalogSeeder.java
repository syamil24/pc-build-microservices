package com.apexbuild.inventory.config;

import com.apexbuild.inventory.domain.Category;
import com.apexbuild.inventory.domain.Product;
import com.apexbuild.inventory.repo.CategoryRepository;
import com.apexbuild.inventory.repo.ProductRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

@Component
@Order(10)
@ConditionalOnProperty(prefix = "apex", name = "catalog-seed", havingValue = "true", matchIfMissing = true)
public class CatalogSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CatalogSeeder.class);

    private static final Category[] CATEGORIES = {
            Category.create("CPU", "Processors", true),
            Category.create("MOTHERBOARD", "Motherboards", true),
            Category.create("RAM", "Memory", true),
            Category.create("GPU", "Graphics cards", true),
            Category.create("STORAGE", "Storage", true),
            Category.create("PSU", "Power supplies", true),
            Category.create("CASE", "Cases", true),
            Category.create("COOLING", "Cooling", true),
            Category.create("LAPTOP", "Laptops", false),
            Category.create("MONITOR", "Monitors", false),
            Category.create("PERIPHERAL", "Peripherals", false)
    };

    private final CategoryRepository categories;
    private final ProductRepository products;
    private final ObjectMapper objectMapper;

    public CatalogSeeder(CategoryRepository categories, ProductRepository products, ObjectMapper objectMapper) {
        this.categories = categories;
        this.products = products;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (categories.count() == 0) {
            categories.saveAll(java.util.List.of(CATEGORIES));
        }
        if (products.count() > 0) {
            return;
        }
        JsonNode root = objectMapper.readTree(new ClassPathResource("catalog-seed.json").getInputStream());
        int count = 0;
        for (JsonNode node : root) {
            String sku = node.get("sku").asText();
            UUID id = UUID.nameUUIDFromBytes(("apex:" + sku).getBytes(StandardCharsets.UTF_8));
            Map<String, Object> specs = objectMapper.convertValue(node.get("specs"), objectMapper.getTypeFactory()
                    .constructMapType(Map.class, String.class, Object.class));
            products.save(Product.create(id, sku, node.get("name").asText(), node.get("category").asText(),
                    node.get("brand").asText(), node.get("description").asText(), node.get("priceCents").asInt(),
                    node.get("stock").asInt(), node.get("hue").asInt(), specs));
            count++;
        }
        log.info("Seeded {} catalog products", count);
    }
}
