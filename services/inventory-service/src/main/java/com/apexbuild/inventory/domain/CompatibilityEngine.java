package com.apexbuild.inventory.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public final class CompatibilityEngine {

    private static final Set<String> SINGLE = Set.of("CPU", "MOTHERBOARD", "RAM", "GPU", "PSU", "CASE", "COOLING");

    private CompatibilityEngine() {
    }

    public static Quote evaluate(List<BuildPart> parts) {
        List<Issue> issues = new ArrayList<>();
        for (String category : SINGLE) {
            long count = parts.stream().filter(part -> part.category().equals(category)).count();
            if (count > 1) {
                issues.add(new Issue("ERROR", "Select only one " + category.toLowerCase(Locale.ROOT)));
            }
        }
        BuildPart cpu = first(parts, "CPU");
        BuildPart board = first(parts, "MOTHERBOARD");
        BuildPart ram = first(parts, "RAM");
        BuildPart gpu = first(parts, "GPU");
        BuildPart psu = first(parts, "PSU");
        BuildPart pcCase = first(parts, "CASE");
        BuildPart cooler = first(parts, "COOLING");

        if (cpu != null && board != null && !text(cpu, "socket").equals(text(board, "socket"))) {
            issues.add(new Issue("ERROR", cpu.name() + " (" + text(cpu, "socket") + ") does not fit "
                    + board.name() + " (" + text(board, "socket") + ")"));
        }
        if (ram != null && board != null && !text(ram, "ramType").equals(text(board, "ramType"))) {
            issues.add(new Issue("ERROR", ram.name() + " is " + text(ram, "ramType") + " but "
                    + board.name() + " needs " + text(board, "ramType")));
        }
        if (pcCase != null && board != null && !caseFits(text(pcCase, "formFactor"), text(board, "formFactor"))) {
            issues.add(new Issue("ERROR", board.name() + " (" + text(board, "formFactor") + ") does not fit the "
                    + text(pcCase, "formFactor") + " case"));
        }
        if (gpu != null && pcCase != null && number(gpu, "lengthMm") > number(pcCase, "maxGpuLengthMm")
                && number(pcCase, "maxGpuLengthMm") > 0) {
            issues.add(new Issue("ERROR", gpu.name() + " is longer than the case allows"));
        }
        if (cooler != null && cpu != null) {
            if (!strings(cooler, "sockets").contains(text(cpu, "socket"))) {
                issues.add(new Issue("ERROR", cooler.name() + " does not support socket " + text(cpu, "socket")));
            }
            if (number(cooler, "tdpWatts") < number(cpu, "tdpWatts")) {
                issues.add(new Issue("ERROR", cooler.name() + " cannot cool " + cpu.name()));
            }
        } else if (cpu != null && cooler == null) {
            issues.add(new Issue("WARN", "No cooler selected. Add one before you power the rig on."));
        }

        int estimated = 80 + (cpu == null ? 0 : number(cpu, "tdpWatts")) + (gpu == null ? 0 : number(gpu, "tdpWatts"));
        Integer psuWatts = psu == null ? null : number(psu, "wattage");
        int required = (int) Math.ceil(estimated * 1.25);
        if (psuWatts != null && psuWatts < required) {
            issues.add(new Issue("ERROR", "PSU is " + psuWatts + "W. This build wants about " + required + "W."));
        } else if (psuWatts != null && psuWatts - required < 80) {
            issues.add(new Issue("WARN", "PSU headroom is tight. A larger unit will run quieter."));
        }
        boolean ok = issues.stream().noneMatch(issue -> issue.severity().equals("ERROR"));
        return new Quote(ok, List.copyOf(issues), estimated, psuWatts, required);
    }

    private static BuildPart first(List<BuildPart> parts, String category) {
        return parts.stream().filter(part -> part.category().equals(category)).findFirst().orElse(null);
    }

    private static boolean caseFits(String caseFactor, String boardFactor) {
        if (caseFactor == null || boardFactor == null) {
            return true;
        }
        return switch (caseFactor) {
            case "ATX" -> Set.of("ATX", "mATX", "ITX").contains(boardFactor);
            case "mATX" -> Set.of("mATX", "ITX").contains(boardFactor);
            case "ITX" -> "ITX".equals(boardFactor);
            default -> false;
        };
    }

    private static String text(BuildPart part, String key) {
        Object value = part.specs().get(key);
        return value == null ? "" : String.valueOf(value);
    }

    private static int number(BuildPart part, String key) {
        Object value = part.specs().get(key);
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value == null || String.valueOf(value).isBlank()) {
            return 0;
        }
        return Integer.parseInt(String.valueOf(value));
    }

    @SuppressWarnings("unchecked")
    private static List<String> strings(BuildPart part, String key) {
        Object value = part.specs().get(key);
        if (value instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        return List.of();
    }

    public record BuildPart(String name, String category, Map<String, Object> specs) {
    }

    public record Issue(String severity, String message) {
    }

    public record Quote(boolean ok, List<Issue> issues, int estimatedWatts, Integer psuWatts, int recommendedPsuWatts) {
    }
}
