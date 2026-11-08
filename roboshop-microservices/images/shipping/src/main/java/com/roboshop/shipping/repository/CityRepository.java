package com.roboshop.shipping.repository;

import com.roboshop.shipping.model.City;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CityRepository extends JpaRepository<City, Long> {
}
