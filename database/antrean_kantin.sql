-- Database Aplikasi Antrean Kantin
-- Import file ini melalui phpMyAdmin (XAMPP).
CREATE DATABASE IF NOT EXISTS db_antrean_kantin
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE db_antrean_kantin;

CREATE TABLE IF NOT EXISTS queue_sequences (
  order_date DATE PRIMARY KEY,
  last_number INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS queue_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  queue_no INT UNSIGNED NOT NULL,
  customer_name VARCHAR(80) NOT NULL,
  order_details VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Menunggu',
  order_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_queue_daily_number (order_date, queue_no),
  INDEX idx_queue_date_status (order_date, status),
  INDEX idx_queue_customer (customer_name)
) ENGINE=InnoDB;
