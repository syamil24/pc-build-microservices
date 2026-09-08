package com.apexbuild.user.service;

import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import com.apexbuild.user.domain.Address;
import com.apexbuild.user.domain.Profile;
import com.apexbuild.user.repo.AddressRepository;
import com.apexbuild.user.repo.ProfileRepository;
import com.apexbuild.user.web.UserDtos.AddressRequest;
import com.apexbuild.user.web.UserDtos.AddressResponse;
import com.apexbuild.user.web.UserDtos.InternalProfileRequest;
import com.apexbuild.user.web.UserDtos.ProfileResponse;
import com.apexbuild.user.web.UserDtos.ProfileUpdate;
import com.apexbuild.web.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ProfileService {

    private final ProfileRepository profiles;
    private final AddressRepository addresses;

    public ProfileService(ProfileRepository profiles, AddressRepository addresses) {
        this.profiles = profiles;
        this.addresses = addresses;
    }

    @Transactional
    public Profile upsert(UUID authUserId, String email, String fullName) {
        return profiles.findByAuthUserId(authUserId).orElseGet(() ->
                profiles.save(Profile.create(authUserId, email, fullName)));
    }

    public ProfileResponse me() {
        return toResponse(current());
    }

    @Transactional
    public ProfileResponse update(ProfileUpdate update) {
        Profile profile = current();
        profile.setFullName(update.fullName());
        profile.setPhone(update.phone());
        return toResponse(profile);
    }

    public List<AddressResponse> addresses() {
        return addresses.findByProfileId(current().getId()).stream().map(this::toAddress).toList();
    }

    @Transactional
    public AddressResponse addAddress(AddressRequest request) {
        Address address = Address.create(current().getId(), request.label(), request.line1(), request.line2(),
                request.city(), request.state(), request.postalCode(), request.country().toUpperCase());
        return toAddress(addresses.save(address));
    }

    @Transactional
    public void deleteAddress(UUID addressId) {
        Address address = addresses.findByIdAndProfileId(addressId, current().getId())
                .orElseThrow(() -> new ApexException(ErrorCode.NOT_FOUND, "Address not found"));
        addresses.delete(address);
    }

    public Address requireAddress(UUID authUserId, UUID addressId) {
        Profile profile = profiles.findByAuthUserId(authUserId)
                .orElseThrow(() -> new ApexException(ErrorCode.NOT_FOUND, "Profile not found"));
        return addresses.findByIdAndProfileId(addressId, profile.getId())
                .orElseThrow(() -> new ApexException(ErrorCode.NOT_FOUND, "Address not found"));
    }

    public ProfileResponse internalCreate(InternalProfileRequest request) {
        return toResponse(upsert(UUID.fromString(request.authUserId()), request.email(), request.fullName()));
    }

    private Profile current() {
        return profiles.findByAuthUserId(CurrentUser.id())
                .orElseThrow(() -> new ApexException(ErrorCode.NOT_FOUND, "Profile not found"));
    }

    private ProfileResponse toResponse(Profile profile) {
        return new ProfileResponse(profile.getId(), profile.getAuthUserId(), profile.getEmail(), profile.getFullName(),
                profile.getPhone());
    }

    private AddressResponse toAddress(Address address) {
        return new AddressResponse(address.getId(), address.getLabel(), address.getLine1(), address.getLine2(),
                address.getCity(), address.getState(), address.getPostalCode(), address.getCountry(), address.snapshot());
    }
}
