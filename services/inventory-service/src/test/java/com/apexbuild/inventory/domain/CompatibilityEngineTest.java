package com.apexbuild.inventory.domain;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CompatibilityEngineTest {

    @Test
    void acceptsAMatchedAm5Build() {
        var quote = CompatibilityEngine.evaluate(List.of(
                part("CPU", "AM5", Map.of("socket", "AM5", "tdpWatts", 105)),
                part("MOTHERBOARD", "B650", Map.of("socket", "AM5", "ramType", "DDR5", "formFactor", "ATX")),
                part("RAM", "32GB", Map.of("ramType", "DDR5")),
                part("GPU", "H70", Map.of("tdpWatts", 200, "lengthMm", 280)),
                part("PSU", "750W", Map.of("wattage", 750)),
                part("CASE", "Frame", Map.of("formFactor", "ATX", "maxGpuLengthMm", 380)),
                part("COOLING", "Tower", Map.of("sockets", List.of("AM5", "LGA1700"), "tdpWatts", 220))
        ));
        assertTrue(quote.ok());
    }

    @Test
    void rejectsDdr4OnADdr5Board() {
        var quote = CompatibilityEngine.evaluate(List.of(
                part("MOTHERBOARD", "B650", Map.of("socket", "AM5", "ramType", "DDR5", "formFactor", "ATX")),
                part("RAM", "DDR4 kit", Map.of("ramType", "DDR4"))
        ));
        assertFalse(quote.ok());
        assertTrue(quote.issues().stream().anyMatch(issue -> issue.message().contains("DDR4")));
    }

    @Test
    void rejectsAnUnderpoweredPsu() {
        var quote = CompatibilityEngine.evaluate(List.of(
                part("CPU", "Hot", Map.of("socket", "AM5", "tdpWatts", 170)),
                part("GPU", "Big", Map.of("tdpWatts", 320, "lengthMm", 300)),
                part("PSU", "550W", Map.of("wattage", 550))
        ));
        assertFalse(quote.ok());
    }

    private static CompatibilityEngine.BuildPart part(String category, String name, Map<String, Object> specs) {
        return new CompatibilityEngine.BuildPart(name, category, specs);
    }
}
