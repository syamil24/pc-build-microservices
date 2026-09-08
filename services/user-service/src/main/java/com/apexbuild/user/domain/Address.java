package com.apexbuild.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "addresses")
public class Address {

    @Id
    private UUID id;

    @Column(name = "profile_id", nullable = false)
    private UUID profileId;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private String line1;

    private String line2;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false)
    private String state;

    @Column(name = "postal_code", nullable = false)
    private String postalCode;

    @Column(nullable = false, length = 2)
    private String country;

    protected Address() {
    }

    public static Address create(UUID profileId, String label, String line1, String line2, String city, String state,
                                 String postalCode, String country) {
        Address address = new Address();
        address.id = UUID.randomUUID();
        address.profileId = profileId;
        address.label = label;
        address.line1 = line1;
        address.line2 = line2;
        address.city = city;
        address.state = state;
        address.postalCode = postalCode;
        address.country = country;
        return address;
    }

    public UUID getId() {
        return id;
    }

    public UUID getProfileId() {
        return profileId;
    }

    public String getLabel() {
        return label;
    }

    public String getLine1() {
        return line1;
    }

    public String getLine2() {
        return line2;
    }

    public String getCity() {
        return city;
    }

    public String getState() {
        return state;
    }

    public String getPostalCode() {
        return postalCode;
    }

    public String getCountry() {
        return country;
    }

    public String snapshot() {
        String extra = line2 == null || line2.isBlank() ? "" : ", " + line2;
        return label + ": " + line1 + extra + ", " + postalCode + " " + city + ", " + state + ", " + country;
    }
}
