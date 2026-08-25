package com.apexbuild.discovery.web;

import com.apexbuild.common.api.ApiResponse;
import com.apexbuild.discovery.service.PlatformPoller;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/platform")
public class PlatformController {

    private final PlatformPoller poller;

    public PlatformController(PlatformPoller poller) {
        this.poller = poller;
    }

    @GetMapping("/overview")
    ResponseEntity<ApiResponse<PlatformOverview>> overview() {
        return ResponseEntity.ok(ApiResponse.ok(poller.latest()));
    }
}
