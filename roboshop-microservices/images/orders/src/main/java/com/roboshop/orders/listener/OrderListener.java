package com.roboshop.orders.listener;

import com.roboshop.orders.model.Order;
import com.roboshop.orders.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class OrderListener {

    private static final Logger logger = LoggerFactory.getLogger(OrderListener.class);

    private final OrderRepository orderRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${notification.url:http://notification:8008}")
    private String notificationUrl;

    @Value("${shipping.url:http://shipping:8004}")
    private String shippingUrl;

    public OrderListener(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @RabbitListener(queues = "orders")
    public void handleOrderEvent(Map<String, Object> event) {
        logger.info("Received order event for user: {}", event.get("userId"));

        try {
            // Get shipping cost
            double shippingCost = 0;
            String shippingCity = "";
            try {
                Object cityIdObj = event.get("cityId");
                if (cityIdObj != null) {
                    String url = shippingUrl + "/shipping/calc?cityId=" + cityIdObj;
                    Map<?, ?> shippingResp = restTemplate.getForObject(url, Map.class);
                    if (shippingResp != null) {
                        shippingCost = ((Number) shippingResp.get("shippingCost")).doubleValue();
                        Object cityObj = shippingResp.get("city");
                        shippingCity = cityObj != null ? cityObj.toString() : "";
                    }
                }
            } catch (Exception e) {
                logger.warn("Failed to get shipping cost: {}", e.getMessage());
            }

            // Create order
            Order order = new Order();
            order.setUserId((String) event.get("userId"));
            order.setUserEmail((String) event.getOrDefault("userEmail", ""));
            order.setUserName((String) event.getOrDefault("userName", ""));
            order.setTotal(((Number) event.get("total")).doubleValue());
            order.setShippingCost(shippingCost);
            order.setShippingCity(shippingCity);
            order.setTransactionId((String) event.get("transactionId"));
            order.setStatus("CONFIRMED");

            @SuppressWarnings("unchecked")
            var items = (java.util.List<Map<String, Object>>) event.get("items");
            if (items != null) {
                var orderItems = items.stream().map(item -> {
                    var oi = new Order.OrderItem();
                    oi.setProductId(((Number) item.get("productId")).intValue());
                    oi.setName((String) item.getOrDefault("name", ""));
                    oi.setSku((String) item.getOrDefault("sku", ""));
                    oi.setPrice(((Number) item.get("price")).doubleValue());
                    oi.setQuantity(((Number) item.get("quantity")).intValue());
                    return oi;
                }).toList();
                order.setItems(orderItems);
            }

            Order saved = orderRepository.save(order);
            logger.info("Order saved: {}", saved.getId());

            // Trigger notification
            try {
                Map<String, Object> notification = Map.of(
                        "orderId", saved.getId(),
                        "email", order.getUserEmail(),
                        "name", order.getUserName(),
                        "total", order.getTotal() + order.getShippingCost()
                );
                restTemplate.postForObject(notificationUrl + "/notification/send", notification, String.class);
            } catch (Exception e) {
                logger.warn("Failed to send notification: {}", e.getMessage());
            }
        } catch (Exception e) {
            logger.error("Failed to process order event: {}", e.getMessage(), e);
        }
    }
}
