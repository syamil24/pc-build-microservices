package com.apexbuild.inventory.repo;

import com.apexbuild.inventory.domain.Category;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, String> {
}
