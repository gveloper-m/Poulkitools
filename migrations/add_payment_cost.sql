-- Migration: Add cost column to payment_methods table
-- This adds the ability to charge a fee for payment methods

ALTER TABLE `payment_methods` 
ADD COLUMN `cost` DECIMAL(10,2) DEFAULT 0 AFTER `description`;
