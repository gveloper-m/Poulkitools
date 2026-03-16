-- Add featured products table for homepage carousel
CREATE TABLE IF NOT EXISTS `featured_products` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `product_id` INT NOT NULL,
  `position` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY `product_unique` (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
