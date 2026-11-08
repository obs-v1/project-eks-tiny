CREATE DATABASE IF NOT EXISTS ratings;
USE ratings;

CREATE TABLE IF NOT EXISTS ratings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    score INT NOT NULL,
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_product (user_id, product_id)
);
