package com.apexbuild.user.web;

import com.apexbuild.common.api.ApiResponse;
import com.apexbuild.user.service.ProfileService;
import com.apexbuild.user.web.UserDtos.AddressRequest;
import com.apexbuild.user.web.UserDtos.AddressResponse;
import com.apexbuild.user.web.UserDtos.InternalProfileRequest;
import com.apexbuild.user.web.UserDtos.ProfileResponse;
import com.apexbuild.user.web.UserDtos.ProfileUpdate;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final ProfileService profileService;

    public UserController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/me")
    ResponseEntity<ApiResponse<ProfileResponse>> me() {
        return ResponseEntity.ok(ApiResponse.ok(profileService.me()));
    }

    @PutMapping("/me")
    ResponseEntity<ApiResponse<ProfileResponse>> update(@Valid @RequestBody ProfileUpdate update) {
        return ResponseEntity.ok(ApiResponse.ok(profileService.update(update)));
    }

    @GetMapping("/me/addresses")
    ResponseEntity<ApiResponse<List<AddressResponse>>> addresses() {
        return ResponseEntity.ok(ApiResponse.ok(profileService.addresses()));
    }

    @PostMapping("/me/addresses")
    ResponseEntity<ApiResponse<AddressResponse>> addAddress(@Valid @RequestBody AddressRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(profileService.addAddress(request)));
    }

    @DeleteMapping("/me/addresses/{id}")
    ResponseEntity<ApiResponse<Void>> deleteAddress(@PathVariable UUID id) {
        profileService.deleteAddress(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/internal/profiles")
    ResponseEntity<ApiResponse<ProfileResponse>> internalCreate(@Valid @RequestBody InternalProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(profileService.internalCreate(request)));
    }

    @GetMapping("/internal/{authUserId}/addresses/{addressId}")
    ResponseEntity<ApiResponse<AddressResponse>> internalAddress(@PathVariable UUID authUserId, @PathVariable UUID addressId) {
        var address = profileService.requireAddress(authUserId, addressId);
        var response = new AddressResponse(address.getId(), address.getLabel(), address.getLine1(), address.getLine2(),
                address.getCity(), address.getState(), address.getPostalCode(), address.getCountry(), address.snapshot());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
