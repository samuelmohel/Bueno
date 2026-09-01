-- ============================================================================
-- BUENO LOGISTICS FREIGHT OS — AUTHORITATIVE ENTERPRISE DATABASE SCHEMA
-- Target Engine: MySQL 8.0+ / MariaDB / PostgreSQL Compatible
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `bueno_freight_os` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `bueno_freight_os`;

-- ----------------------------------------------------------------------------
-- 1. USERS & ACCOUNT PROVISIONING
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `full_name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `phone` VARCHAR(32) DEFAULT NULL,
  `role` ENUM('ADMIN', 'HEAD_OF_OPERATIONS', 'CEO', 'HEAD_OF_FINANCE', 'CARGO_OFFICER', 'CUSTOMER') NOT NULL,
  `user_type` ENUM('STAFF', 'CUSTOMER') NOT NULL DEFAULT 'STAFF',
  `assigned_station` VARCHAR(16) DEFAULT 'EWK',
  `station_name` VARCHAR(191) DEFAULT 'Ewekoro Terminal',
  `company_name` VARCHAR(191) DEFAULT NULL,
  `staff_id` VARCHAR(64) DEFAULT NULL,
  `pin_hash` VARCHAR(255) NOT NULL DEFAULT '1111',
  `status` ENUM('ACTIVE', 'DEACTIVATED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_station` (`assigned_station`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 2. RAILWAY WAGON FLEET INVENTORY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `wagons` (
  `wagon_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `wagon_type` VARCHAR(32) NOT NULL DEFAULT 'PXG',
  `capacity_bags` INT NOT NULL DEFAULT 1200,
  `status` ENUM('AVAILABLE', 'LOADING', 'LOADED', 'IN_TRANSIT', 'UNLOADING', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
  `current_station` VARCHAR(16) NOT NULL DEFAULT 'EWK',
  `gauge_type` ENUM('STANDARD_GAUGE', 'NARROW_GAUGE') NOT NULL DEFAULT 'STANDARD_GAUGE',
  `registered_by` VARCHAR(64) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`registered_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_wagons_status` (`status`),
  INDEX `idx_wagons_station` (`current_station`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 3. COMMERCIAL FREIGHT DEALS & CONTRACTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `deals` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `deal_number` VARCHAR(64) NOT NULL UNIQUE,
  `company_name` VARCHAR(191) NOT NULL,
  `loading_station` VARCHAR(16) NOT NULL DEFAULT 'EWK',
  `destination_station` VARCHAR(16) NOT NULL DEFAULT 'MNY',
  `cargo_type` VARCHAR(191) NOT NULL DEFAULT 'Bagged Cement (50kg)',
  `total_quantity_bags` INT NOT NULL DEFAULT 1610,
  `consignee_user_id` VARCHAR(64) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`consignee_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_deals_company` (`company_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 4. FREIGHT HAULAGE TRIPS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `trips` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `trip_number` VARCHAR(64) NOT NULL UNIQUE,
  `locomotive_id` VARCHAR(64) NOT NULL DEFAULT 'L2205',
  `origin_station` VARCHAR(16) NOT NULL DEFAULT 'EWK',
  `destination_station` VARCHAR(16) NOT NULL DEFAULT 'MNY',
  `company_name` VARCHAR(191) NOT NULL,
  `deal_number` VARCHAR(64) DEFAULT NULL,
  `quantity_bags` INT NOT NULL DEFAULT 1610,
  `cargo_officer_id` VARCHAR(64) NOT NULL,
  `unloading_officer_id` VARCHAR(64) DEFAULT NULL,
  `escort_phone` VARCHAR(32) DEFAULT NULL,
  `status` ENUM('LOADING', 'IN_TRANSIT', 'UNLOADING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'LOADING',
  `dispatch_time` DATETIME DEFAULT NULL,
  `arrival_time` DATETIME DEFAULT NULL,
  `damaged_units` INT NOT NULL DEFAULT 0,
  `burst_bags` INT NOT NULL DEFAULT 0,
  `complaint_notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`cargo_officer_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`unloading_officer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_trips_status` (`status`),
  INDEX `idx_trips_loco` (`locomotive_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 5. WAGON LOADING LOGS & SECURITY SEALS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `trip_wagon_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `trip_id` VARCHAR(64) NOT NULL,
  `wagon_id` VARCHAR(64) NOT NULL,
  `seal_number` VARCHAR(64) NOT NULL,
  `bags_loaded` INT NOT NULL DEFAULT 70,
  `status` ENUM('LOADING', 'LOADED', 'UNLOADED') NOT NULL DEFAULT 'LOADED',
  `loaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`wagon_id`) REFERENCES `wagons` (`wagon_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 6. FINANCIAL OPERATIONAL REQUISITIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `requisitions` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `requisition_no` VARCHAR(64) NOT NULL UNIQUE,
  `category` ENUM('TARPAULIN', 'PAYLOADER', 'FREIGHT', 'LOADERS', 'GENERAL') NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `amount_ngn` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `requested_by_id` VARCHAR(64) NOT NULL,
  `station_code` VARCHAR(16) NOT NULL DEFAULT 'EWK',
  `trip_id` VARCHAR(64) DEFAULT NULL,
  `vessel_no` VARCHAR(64) DEFAULT NULL,
  `stage` ENUM('Admin', 'Head of Operations', 'CEO', 'Accountant', 'DISBURSED', 'REJECTED') NOT NULL DEFAULT 'Admin',
  `status` ENUM('PENDING_APPROVAL', 'APPROVED', 'DISBURSED', 'REJECTED') NOT NULL DEFAULT 'PENDING_APPROVAL',
  `payment_ref` VARCHAR(128) DEFAULT NULL,
  `disbursed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`requested_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  INDEX `idx_req_stage` (`stage`),
  INDEX `idx_req_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 7. MONIYA CONTAINER TERMINAL YARD & DEMURRAGE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `containers` (
  `container_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `shipping_agent` VARCHAR(64) NOT NULL,
  `container_size` VARCHAR(32) NOT NULL DEFAULT '40ft HC',
  `category` ENUM('CONTAINERS-IMPORT', 'CONTAINERS-EXPORT', 'EMPTY') NOT NULL,
  `arrival_date` DATE NOT NULL,
  `bay_code` VARCHAR(16) NOT NULL DEFAULT 'Bay A',
  `row_code` VARCHAR(16) NOT NULL DEFAULT 'Row 1',
  `col_code` VARCHAR(16) NOT NULL DEFAULT 'Col 1',
  `tier_level` INT NOT NULL DEFAULT 1,
  `dwell_days` INT NOT NULL DEFAULT 1,
  `gate_status` ENUM('IN_YARD', 'DISPATCHED_OUT') NOT NULL DEFAULT 'IN_YARD',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_containers_agent` (`shipping_agent`),
  INDEX `idx_containers_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 8. MONIYA GATE TRUCK PASS LOGS (₦2,000 TARIFF)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `gate_logs` (
  `pass_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `truck_reg_no` VARCHAR(32) NOT NULL,
  `driver_name` VARCHAR(191) NOT NULL,
  `driver_phone` VARCHAR(32) NOT NULL,
  `transporter_name` VARCHAR(191) NOT NULL,
  `container_id` VARCHAR(64) NOT NULL,
  `action` ENUM('INBOUND_RECEIVE', 'OUTBOUND_DISPATCH') NOT NULL,
  `fee_paid_ngn` DECIMAL(10,2) NOT NULL DEFAULT 2000.00,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`container_id`) REFERENCES `containers` (`container_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
