-- Database Schema for E-Shop Application

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `banners` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(255),
  `image_path` VARCHAR(255),
  `link` VARCHAR(255),
  `position` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `shipping_methods` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `cost` DECIMAL(10,2),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `payment_methods` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `cost` DECIMAL(10,2) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `xml_import_log` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `import_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `products_imported` INT,
  `status` VARCHAR(50),
  `error_message` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Translations table for multi-language support
CREATE TABLE IF NOT EXISTS `translations` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `greek_text` VARCHAR(500) UNIQUE NOT NULL,
  `english_text` VARCHAR(500),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `slug` VARCHAR(255) UNIQUE,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default admin credentials (username: admin, password: admin123)
INSERT IGNORE INTO `settings` (`id`, `admin_username`, `admin_password`, `site_name`, `contact_email`) 
VALUES (1, 'admin', '$2y$10$YIjlrBtkgEuIvY1/9UdpPuxp2Z9tQIKFjUcPT/nv0VmFvvUAuHxOm', 'Poulki Shop', 'poulki.tools@gmail.com');

CREATE INDEX idx_product_unique ON products(unique_id);
CREATE INDEX idx_product_category ON products(cat_id);
CREATE INDEX idx_product_name ON products(name);
CREATE INDEX idx_order_code ON orders(order_code);
CREATE INDEX idx_order_email ON orders(customer_email);
CREATE INDEX idx_translation_greek ON translations(greek_text);
CREATE INDEX idx_category_name ON categories(name);
CREATE INDEX idx_category_slug ON categories(slug);
