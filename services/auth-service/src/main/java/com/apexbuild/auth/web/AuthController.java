package com.apexbuild.auth.web;

import com.apexbuild.auth.service.AuthService;
import com.apexbuild.auth.web.AuthRequests.AuthResponse;
import com.apexbuild.auth.web.AuthRequests.LoginRequest;
import com.apexbuild.auth.web.AuthRequests.MeResponse;
import com.apexbuild.auth.web.AuthRequests.RefreshRequest;
import com.apexbuild.auth.web.AuthRequests.RegisterRequest;
import com.apexbuild.common.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(authService.register(request, "CUSTOMER")));
    }

    @PostMapping("/login")
    ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(authService.login(request)));
    }

    @PostMapping("/refresh")
    ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(authService.refresh(request)));
    }

    @GetMapping("/me")
    ResponseEntity<ApiResponse<MeResponse>> me() {
        return ResponseEntity.ok(ApiResponse.ok(authService.me()));
    }
}
