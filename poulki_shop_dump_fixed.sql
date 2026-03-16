-- Poulki Shop Database Dump (Fixed for restricted user)
-- Complete database schema with default data
-- NOTE: Database 'poulki_shop' must already exist

-- =====================================================
-- TABLE: settings
-- =====================================================
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `site_name` VARCHAR(255),
  `site_logo` VARCHAR(255),
  `site_favicon` VARCHAR(255),
  `contact_email` VARCHAR(255),
  `contact_phone` VARCHAR(255),
  `footer_text` TEXT,
  `social_facebook` VARCHAR(255),
  `social_instagram` VARCHAR(255),
  `social_twitter` VARCHAR(255),
  `social_youtube` VARCHAR(255),
  `admin_username` VARCHAR(255),
  `admin_password` VARCHAR(255),
  `maps_iframe_url` TEXT,
  `about_us_text` TEXT,
  `home_title` VARCHAR(255),
  `home_description` TEXT,
  `search_image` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: products
-- =====================================================
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `unique_id` VARCHAR(255) UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `model` VARCHAR(255),
  `link` VARCHAR(255),
  `image` VARCHAR(255),
  `category` VARCHAR(255),
  `cat_id` VARCHAR(255),
  `price_with_vat` DECIMAL(10,2),
  `thursday_price` DECIMAL(10,2),
  `manufacturer` VARCHAR(255),
  `mpa` VARCHAR(255),
  `gan` VARCHAR(255),
  `weight` VARCHAR(255),
  `instock` VARCHAR(10),
  `availability` VARCHAR(255),
  `quantity` INT DEFAULT 0,
  `extra_images` LONGTEXT,
  `imported_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_product_unique` (`unique_id`),
  KEY `idx_product_category` (`cat_id`),
  KEY `idx_product_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: banners
-- =====================================================
CREATE TABLE IF NOT EXISTS `banners` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(255),
  `image_path` VARCHAR(255),
  `link` VARCHAR(255),
  `position` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: shipping_methods
-- =====================================================
CREATE TABLE IF NOT EXISTS `shipping_methods` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `cost` DECIMAL(10,2),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: payment_methods
-- =====================================================
CREATE TABLE IF NOT EXISTS `payment_methods` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `cost` DECIMAL(10,2) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: orders
-- =====================================================
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `order_code` VARCHAR(255) UNIQUE NOT NULL,
  `customer_name` VARCHAR(255),
  `customer_email` VARCHAR(255),
  `customer_phone` VARCHAR(255),
  `customer_address` TEXT,
  `customer_city` VARCHAR(255),
  `customer_state` VARCHAR(255),
  `customer_postal_code` VARCHAR(20),
  `shipping_method_id` INT,
  `payment_method_id` INT,
  `total_amount` DECIMAL(10,2),
  `status` VARCHAR(50) DEFAULT 'pending',
  `tracking_code` VARCHAR(255),
  `notes` TEXT,
  `items` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`shipping_method_id`) REFERENCES `shipping_methods`(`id`),
  FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`),
  KEY `idx_order_code` (`order_code`),
  KEY `idx_order_email` (`customer_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: xml_import_log
-- =====================================================
CREATE TABLE IF NOT EXISTS `xml_import_log` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `import_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `products_imported` INT,
  `status` VARCHAR(50),
  `error_message` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: translations
-- =====================================================
CREATE TABLE IF NOT EXISTS `translations` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `greek_text` VARCHAR(500) UNIQUE NOT NULL,
  `english_text` VARCHAR(500),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_translation_greek` (`greek_text`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: categories
-- =====================================================
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `slug` VARCHAR(255) UNIQUE,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_category_name` (`name`),
  KEY `idx_category_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: featured_products (From migration)
-- =====================================================
CREATE TABLE IF NOT EXISTS `featured_products` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `product_id` INT NOT NULL,
  `position` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `product_unique` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Default Admin User
-- Username: admin
-- Password: admin123 (bcrypt hashed)
INSERT IGNORE INTO `settings` (`id`, `admin_username`, `admin_password`, `site_name`, `contact_email`) 
VALUES (1, 'admin', '$2y$10$YIjlrBtkgEuIvY1/9UdpPuxp2Z9tQIKFjUcPT/nv0VmFvvUAuHxOm', 'Poulki Shop', 'poulki.tools@gmail.com');

-- Default Shipping Methods
INSERT IGNORE INTO `shipping_methods` (`id`, `name`, `description`, `cost`) VALUES
(1, 'Standard Shipping', 'Regular ground shipping', 5.00),
(2, 'Express Shipping', 'Fast delivery within 2-3 days', 15.00),
(3, 'Pickup at Store', 'Free pickup at our location', 0.00);

-- Default Payment Methods
INSERT IGNORE INTO `payment_methods` (`id`, `name`, `description`, `cost`) VALUES
(1, 'Credit/Debit Card', 'Visa, Mastercard, etc.', 0.00),
(2, 'Bank Transfer', 'Direct bank transfer', 0.00),
(3, 'PayPal', 'PayPal payment gateway', 0.00),
(4, 'Cash on Delivery', 'Pay when you receive', 0.00);

-- =====================================================
-- DATABASE READY
-- =====================================================
-- All tables created and default data inserted
-- Next: Upload files to server and run migrations
