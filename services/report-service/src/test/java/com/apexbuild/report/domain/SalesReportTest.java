package com.apexbuild.report.domain;

import com.apexbuild.common.error.ApexException;
import com.apexbuild.report.domain.SalesReport.Fact;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SalesReportTest {

    @Test
    void groupsUnitsAndRevenueBySku() {
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        var summary = SalesReport.summarize("2026-10", "GPU", List.of(
                new Fact(first, "GPU", "GPU-A", "Card A", 1, 10000),
                new Fact(second, "GPU", "GPU-A", "Card A", 2, 20000),
                new Fact(second, "GPU", "GPU-B", "Card B", 1, 5000)));
        assertEquals(2, summary.orderCount());
        assertEquals(4, summary.unitCount());
        assertEquals(35000, summary.totalCents());
        assertEquals(2, summary.rows().size());
        assertEquals(3, summary.rows().get(0).quantity());
        assertEquals(30000, summary.rows().get(0).revenueCents());
    }

    @Test
    void rejectsAMonthThatIsNotACalendarMonth() {
        ApexException ex = assertThrows(ApexException.class, () -> SalesReport.parseMonth("2026-13"));
        assertEquals("Month must look like 2026-10", ex.getMessage());
    }
}
