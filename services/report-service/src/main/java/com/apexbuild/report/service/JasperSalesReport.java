package com.apexbuild.report.service;

import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import com.apexbuild.report.domain.SalesReport;
import net.sf.jasperreports.engine.DefaultJasperReportsContext;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class JasperSalesReport {

    public byte[] render(SalesReport.Summary summary) {
        DefaultJasperReportsContext.getInstance().setProperty("net.sf.jasperreports.awt.ignore.missing.font", "true");
        List<SalesPdfRow> rows = summary.rows().stream()
                .map(row -> new SalesPdfRow(row.categoryCode(), row.sku(), row.productName(), row.quantity(),
                        SalesReport.ringgit(row.revenueCents())))
                .toList();
        try (InputStream template = JasperSalesReport.class.getResourceAsStream("/reports/sales.jrxml")) {
            if (template == null) {
                throw new ApexException(ErrorCode.DEPENDENCY_FAILED, "Sales report template is missing");
            }
            JasperReport report = JasperCompileManager.compileReport(template);
            Map<String, Object> params = new HashMap<>();
            params.put("month", summary.month());
            params.put("category", summary.category());
            params.put("totalLabel", SalesReport.ringgit(summary.totalCents()));
            var print = JasperFillManager.fillReport(report, params, new JRBeanCollectionDataSource(rows));
            return JasperExportManager.exportReportToPdf(print);
        } catch (ApexException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApexException(ErrorCode.DEPENDENCY_FAILED, "Could not render the sales report");
        }
    }
}
