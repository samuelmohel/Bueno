-- ---------------------------------------------------------------------------
-- 001 — Baseline schema (MySQL)
--
-- Mirrors exactly the tables that db.php::initTables() used to create on every
-- request. On an existing production database every statement here is a no-op,
-- which is the point: this migration adopts the current schema into the
-- migration ledger without touching live data.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bueno_users (
    id              VARCHAR(100) NOT NULL PRIMARY KEY,
    fullName        VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(100),
    role            VARCHAR(100) NOT NULL,
    userType        VARCHAR(50)  NOT NULL,
    assignedStation VARCHAR(50),
    companyName     VARCHAR(255),
    staffId         VARCHAR(100),
    pin             VARCHAR(20)  DEFAULT '1111',
    status          VARCHAR(50)  DEFAULT 'ACTIVE',
    permissionsText TEXT,
    createdAt       VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bueno_client_requests (
    id          VARCHAR(100) NOT NULL PRIMARY KEY,
    companyName VARCHAR(255) NOT NULL,
    industry    VARCHAR(100),
    contactName VARCHAR(255),
    email       VARCHAR(255),
    phone       VARCHAR(100),
    volume      VARCHAR(100),
    route       VARCHAR(255),
    status      VARCHAR(50) DEFAULT 'PENDING',
    createdAt   VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bueno_negotiations (
    id             VARCHAR(100) NOT NULL PRIMARY KEY,
    companyName    VARCHAR(255) NOT NULL,
    contactName    VARCHAR(255),
    email          VARCHAR(255),
    loadingStation VARCHAR(50),
    destination    VARCHAR(50),
    cargoType      VARCHAR(255),
    quantity       VARCHAR(100),
    targetDate     VARCHAR(100),
    status         VARCHAR(50) DEFAULT 'UNDER_NEGOTIATION',
    messagesText   TEXT,
    createdAt      VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bueno_deals (
    id             VARCHAR(100) NOT NULL PRIMARY KEY,
    dealNumber     VARCHAR(100),
    company        VARCHAR(255) NOT NULL,
    loadingStation VARCHAR(50),
    destination    VARCHAR(50),
    cargoType      VARCHAR(255),
    quantity       VARCHAR(100),
    status         VARCHAR(50) DEFAULT 'ACTIVE',
    tripId         VARCHAR(100),
    createdBy      VARCHAR(255),
    createdAt      VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bueno_trips (
    id                   VARCHAR(100) NOT NULL PRIMARY KEY,
    tripId               VARCHAR(100),
    dealNumber           VARCHAR(100),
    locomotiveId         VARCHAR(100),
    cargoOfficerName     VARCHAR(255),
    unloadingOfficerName VARCHAR(255),
    escortOfficerName    VARCHAR(255),
    escortPhone          VARCHAR(100),
    escortWagonId        VARCHAR(100),
    company              VARCHAR(255),
    clientEmail          VARCHAR(255),
    cargoType            VARCHAR(255),
    unitOfMeasure        VARCHAR(50)  DEFAULT 'Bags',
    wagonType            VARCHAR(100) DEFAULT 'Covered Hopper Wagon',
    quantity             VARCHAR(100),
    origin               VARCHAR(50),
    destination          VARCHAR(50),
    status               VARCHAR(50)  DEFAULT 'LOADING',
    curLat               DOUBLE       DEFAULT 6.8974,
    curLng               DOUBLE       DEFAULT 3.2141,
    speed                INT          DEFAULT 0,
    departedAt           VARCHAR(100),
    completedAt          VARCHAR(100),
    dispatchTime         VARCHAR(100),
    tripRevenue          DOUBLE       DEFAULT 0,
    tripCost             DOUBLE       DEFAULT 0,
    wagonLogsText        TEXT,
    feederTrucksText     TEXT,
    damagesText          TEXT,
    unloadLogsText       TEXT,
    createdAt            VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bueno_fund_requests (
    id                  VARCHAR(100) NOT NULL PRIMARY KEY,
    requisitionNo       VARCHAR(100),
    title               VARCHAR(255) NOT NULL,
    officerName         VARCHAR(255),
    requestedBy         VARCHAR(255),
    officerId           VARCHAR(100),
    station             VARCHAR(50),
    tripNo              VARCHAR(100),
    tripId              VARCHAR(100),
    vesselNo            VARCHAR(100),
    amount              DOUBLE,
    category            VARCHAR(100),
    description         TEXT,
    stage               VARCHAR(100) DEFAULT 'Admin',
    status              VARCHAR(50)  DEFAULT 'PENDING',
    conversationText    TEXT,
    paymentDetailsText  TEXT,
    date                VARCHAR(100),
    createdAt           VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bueno_wagons (
    id              VARCHAR(100) NOT NULL PRIMARY KEY,
    wagonType       VARCHAR(100) DEFAULT 'Covered Hopper Wagon',
    payloadCapacity VARCHAR(100) DEFAULT '60 MT (1,200 Bags)',
    capacity        INT          DEFAULT 1200,
    status          VARCHAR(50)  DEFAULT 'AVAILABLE',
    currentStation  VARCHAR(50)  DEFAULT 'EWK',
    gauge           VARCHAR(50)  DEFAULT 'STANDARD_GAUGE',
    addedBy         VARCHAR(255) DEFAULT 'System Registry',
    createdAt       VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bueno_notifications (
    id        VARCHAR(100) NOT NULL PRIMARY KEY,
    title     VARCHAR(255) NOT NULL,
    body      TEXT,
    time      VARCHAR(100),
    type      VARCHAR(100),
    targetId  VARCHAR(200),
    targetTab VARCHAR(100),
    readInt   INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bueno_role_permissions (
    roleKey         VARCHAR(100) NOT NULL PRIMARY KEY,
    permissionsJson TEXT NOT NULL,
    updatedAt       VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bueno_system_settings (
    settingKey   VARCHAR(100) NOT NULL PRIMARY KEY,
    settingValue TEXT NOT NULL,
    updatedAt    VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bueno_invoices (
    id                 VARCHAR(100) NOT NULL PRIMARY KEY,
    invoiceNumber      VARCHAR(100),
    tripId             VARCHAR(100),
    dealId             VARCHAR(100),
    companyName        VARCHAR(255),
    clientEmail        VARCHAR(255),
    cargoType          VARCHAR(255),
    route              VARCHAR(255),
    totalBags          INT    DEFAULT 0,
    totalTonnes        DOUBLE DEFAULT 0,
    ratePerTonne       DOUBLE DEFAULT 0,
    subtotal           DOUBLE DEFAULT 0,
    damageUnits        INT    DEFAULT 0,
    damageDeduction    DOUBLE DEFAULT 0,
    tax                DOUBLE DEFAULT 0,
    totalAmount        DOUBLE DEFAULT 0,
    amountPaid         DOUBLE DEFAULT 0,
    balance            DOUBLE DEFAULT 0,
    status             VARCHAR(50) DEFAULT 'UNPAID',
    paymentRef         VARCHAR(100),
    damageDetailsJson  TEXT,
    paymentHistoryJson TEXT,
    itemsText          TEXT,
    issueDate          VARCHAR(100),
    dueDate            VARCHAR(100),
    createdAt          VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bueno_trip_costs (
    id            VARCHAR(100) NOT NULL PRIMARY KEY,
    tripId        VARCHAR(100) NOT NULL,
    category      VARCHAR(100) NOT NULL,
    title         VARCHAR(255) NOT NULL,
    vendor        VARCHAR(255),
    amount        DOUBLE NOT NULL,
    voucherNo     VARCHAR(100),
    paymentStatus VARCHAR(50) DEFAULT 'PAID',
    recordedBy    VARCHAR(255),
    date          VARCHAR(100),
    createdAt     VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bueno_gps_logs (
    id            VARCHAR(100) NOT NULL PRIMARY KEY,
    tripId        VARCHAR(100),
    locomotiveId  VARCHAR(100),
    lat           DOUBLE,
    lng           DOUBLE,
    speed         INT    DEFAULT 0,
    heading       DOUBLE DEFAULT 0,
    accuracy      DOUBLE DEFAULT 3,
    batteryLevel  INT    DEFAULT 100,
    officerPhone  VARCHAR(50),
    signalQuality VARCHAR(50) DEFAULT 'MOBILE_PHONE_GPS_LIVE',
    timestamp     VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
