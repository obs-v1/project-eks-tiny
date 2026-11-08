package com.roboshop.orders.controller;

import com.roboshop.orders.model.Order;
import com.roboshop.orders.repository.OrderRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin
public class OrderController {

    private final OrderRepository orderRepository;

    public OrderController(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "OK", "service", "orders");
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<Order> getOrder(@PathVariable String id) {
        return orderRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/orders/user/{userId}")
    public List<Order> getUserOrders(@PathVariable String userId) {
        return orderRepository.findByUserIdOrderByOrderDateDesc(userId);
    }

    @PostMapping("/orders")
    public Order createOrder(@RequestBody Order order) {
        return orderRepository.save(order);
    }
}
