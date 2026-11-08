CREATE TABLE IF NOT EXISTS cities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL,
    city VARCHAR(200) NOT NULL,
    region VARCHAR(200),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7)
);
