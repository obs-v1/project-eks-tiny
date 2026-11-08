package com.roboshop.shipping.controller;

import com.roboshop.shipping.model.City;
import com.roboshop.shipping.repository.CityRepository;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin
public class ShippingController {

    private final CityRepository cityRepository;

    private static final double WAREHOUSE_LAT = 40.7128;
    private static final double WAREHOUSE_LON = -74.0060;

    public ShippingController(CityRepository cityRepository) {
        this.cityRepository = cityRepository;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "OK", "service", "shipping");
    }

    @GetMapping("/shipping/cities")
    public List<City> getCities() {
        return cityRepository.findAll();
    }

    @GetMapping("/shipping/calc")
    public Map<String, Object> calculateShipping(@RequestParam Long cityId) {
        City city = cityRepository.findById(cityId)
                .orElseThrow(() -> new RuntimeException("City not found"));

        double distance = haversineDistance(
                WAREHOUSE_LAT, WAREHOUSE_LON,
                city.getLatitude().doubleValue(), city.getLongitude().doubleValue()
        );

        double cost = Math.max(5.0, Math.min(50.0, 5.0 + (distance * 0.005)));
        BigDecimal shippingCost = BigDecimal.valueOf(cost).setScale(2, RoundingMode.HALF_UP);

        return Map.of("cityId", cityId, "city", city.getCity(), "shippingCost", shippingCost);
    }

    private double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
