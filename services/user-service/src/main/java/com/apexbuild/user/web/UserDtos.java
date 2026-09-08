package com.apexbuild.user.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class UserDtos {

    private UserDtos() {
    }

    public record ProfileResponse(UUID id, UUID authUserId, String email, String fullName, String phone) {
    }

    public record ProfileUpdate(@NotBlank @Size(max = 120) String fullName, @Size(max = 32) String phone) {
    }

    public record AddressRequest(
            @NotBlank @Size(max = 40) String label,
            @NotBlank @Size(max = 200) String line1,
            @Size(max = 200) String line2,
            @NotBlank @Size(max = 80) String city,
            @NotBlank @Size(max = 80) String state,
            @NotBlank @Size(max = 20) String postalCode,
            @NotBlank @Size(min = 2, max = 2) String country
    ) {
    }

    public record AddressResponse(UUID id, String label, String line1, String line2, String city, String state,
                                  String postalCode, String country, String snapshot) {
    }

    public record InternalProfileRequest(@NotBlank String authUserId, @NotBlank String email, @NotBlank String fullName) {
    }
}
