package com.apexbuild.user.repo;

import com.apexbuild.user.domain.Address;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AddressRepository extends JpaRepository<Address, UUID> {

    List<Address> findByProfileId(UUID profileId);

    Optional<Address> findByIdAndProfileId(UUID id, UUID profileId);
}
