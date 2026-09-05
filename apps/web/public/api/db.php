<?php
// cPanel & SQLite Unified Production Database Helper
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

function getDbConnection() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dbHost = getenv('DB_HOST') ?: 'localhost';
    $dbName = getenv('DB_NAME') ?: 'bueno_db';
    $dbUser = getenv('DB_USER') ?: 'bueno_user';
    $dbPass = getenv('DB_PASS') ?: '';

    // Check .env files on server
    $candidates = [__DIR__ . '/.env', __DIR__ . '/../.env', __DIR__ . '/../../.env', __DIR__ . '/.env.local'];
    foreach ($candidates as $cand) {
        if (file_exists($cand) && is_readable($cand)) {
            $lines = file($cand, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || strpos($line, '#') === 0) continue;
                if (strpos($line, '=') !== false) {
                    list($k, $v) = explode('=', $line, 2);
                    $k = trim($k);
                    $v = trim($v, " \t\n\r\0\x0B\"'");
                    if ($k === 'DB_HOST') $dbHost = $v;
                    if ($k === 'DB_NAME') $dbName = $v;
                    if ($k === 'DB_USER') $dbUser = $v;
                    if ($k === 'DB_PASS') $dbPass = $v;
                }
            }
        }
    }

    if ($dbPass !== '') {
        try {
            $pdo = new PDO("mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            initTables($pdo);
            return $pdo;
        } catch (Exception $e) {}
    }

    // SQLite local file fallback
    try {
        $sqlitePath = __DIR__ . '/bueno.sqlite';
        $pdo = new PDO("sqlite:" . $sqlitePath, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        initTables($pdo);
        return $pdo;
    } catch (Exception $e) {
        // SQLite temp dir fallback
        try {
            $tempSqlite = sys_get_temp_dir() . '/bueno.sqlite';
            $pdo = new PDO("sqlite:" . $tempSqlite, null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            initTables($pdo);
            return $pdo;
        } catch (Exception $e2) {
            return null;
        }
    }
}

function initTables($pdo) {
    // 1. Users Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_users (
        id VARCHAR(100) PRIMARY KEY,
        fullName VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(100),
        role VARCHAR(100) NOT NULL,
        userType VARCHAR(50) NOT NULL,
        assignedStation VARCHAR(50),
        companyName VARCHAR(255),
        staffId VARCHAR(100),
        pin VARCHAR(20) DEFAULT '1111',
        status VARCHAR(50) DEFAULT 'ACTIVE',
        permissionsText TEXT,
        createdAt VARCHAR(100)
    )");

    // 2. Client Requests Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_client_requests (
        id VARCHAR(100) PRIMARY KEY,
        companyName VARCHAR(255) NOT NULL,
        industry VARCHAR(100),
        contactName VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(100),
        volume VARCHAR(100),
        route VARCHAR(255),
        status VARCHAR(50) DEFAULT 'PENDING',
        createdAt VARCHAR(100)
    )");

    // 3. Custom Deal Negotiations Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_negotiations (
        id VARCHAR(100) PRIMARY KEY,
        companyName VARCHAR(255) NOT NULL,
        contactName VARCHAR(255),
        loadingStation VARCHAR(50),
        destination VARCHAR(50),
        cargoType VARCHAR(255),
        quantity VARCHAR(100),
        targetDate VARCHAR(100),
        status VARCHAR(50) DEFAULT 'UNDER_NEGOTIATION',
        messagesText TEXT,
        createdAt VARCHAR(100)
    )");

    // 4. Official Deals Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_deals (
        id VARCHAR(100) PRIMARY KEY,
        dealNumber VARCHAR(100),
        company VARCHAR(255) NOT NULL,
        loadingStation VARCHAR(50),
        destination VARCHAR(50),
        cargoType VARCHAR(255),
        quantity VARCHAR(100),
        status VARCHAR(50) DEFAULT 'ACTIVE',
        tripId VARCHAR(100),
        createdBy VARCHAR(255),
        createdAt VARCHAR(100)
    )");

    try { $pdo->exec("ALTER TABLE bueno_deals ADD COLUMN status VARCHAR(50) DEFAULT 'ACTIVE'"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE bueno_deals ADD COLUMN tripId VARCHAR(100)"); } catch (Exception $e) {}

    // 5. Comprehensive Trips & Consist Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_trips (
        id VARCHAR(100) PRIMARY KEY,
        tripId VARCHAR(100),
        dealNumber VARCHAR(100),
        locomotiveId VARCHAR(100),
        cargoOfficerName VARCHAR(255),
        unloadingOfficerName VARCHAR(255),
        escortOfficerName VARCHAR(255),
        escortPhone VARCHAR(100),
        escortWagonId VARCHAR(100),
        company VARCHAR(255),
        clientEmail VARCHAR(255),
        cargoType VARCHAR(255),
        unitOfMeasure VARCHAR(50) DEFAULT 'Bags',
        wagonType VARCHAR(100) DEFAULT 'Covered Hopper Wagon',
        quantity VARCHAR(100),
        origin VARCHAR(50),
        destination VARCHAR(50),
        status VARCHAR(50) DEFAULT 'LOADING',
        curLat REAL DEFAULT 6.8974,
        curLng REAL DEFAULT 3.2141,
        speed INT DEFAULT 0,
        departedAt VARCHAR(100),
        completedAt VARCHAR(100),
        dispatchTime VARCHAR(100),
        tripRevenue REAL DEFAULT 0,
        tripCost REAL DEFAULT 0,
        wagonLogsText TEXT,
        feederTrucksText TEXT,
        damagesText TEXT,
        unloadLogsText TEXT,
        createdAt VARCHAR(100)
    )");

    // Schema migration helper for existing tables
    $tripColumns = ['dealNumber', 'escortOfficerName', 'escortPhone', 'escortWagonId', 'clientEmail', 'unitOfMeasure', 'wagonType', 'speed', 'departedAt', 'completedAt', 'dispatchTime', 'tripRevenue', 'tripCost', 'feederTrucksText', 'damagesText', 'unloadLogsText'];
    foreach ($tripColumns as $col) {
        try {
            $pdo->exec("ALTER TABLE bueno_trips ADD COLUMN {$col} TEXT");
        } catch (Exception $e) {}
    }

    // 6. Fund Requests Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_fund_requests (
        id VARCHAR(100) PRIMARY KEY,
        requisitionNo VARCHAR(100),
        title VARCHAR(255) NOT NULL,
        officerName VARCHAR(255),
        requestedBy VARCHAR(255),
        officerId VARCHAR(100),
        station VARCHAR(50),
        tripNo VARCHAR(100),
        tripId VARCHAR(100),
        vesselNo VARCHAR(100),
        amount REAL,
        category VARCHAR(100),
        description TEXT,
        stage VARCHAR(100) DEFAULT 'Admin',
        status VARCHAR(50) DEFAULT 'PENDING',
        conversationText TEXT,
        paymentDetailsText TEXT,
        date VARCHAR(100),
        createdAt VARCHAR(100)
    )");

    $fundCols = ['requisitionNo', 'requestedBy', 'officerId', 'tripNo', 'tripId', 'vesselNo', 'status', 'createdAt'];
    foreach ($fundCols as $col) {
        try {
            $pdo->exec("ALTER TABLE bueno_fund_requests ADD COLUMN {$col} TEXT");
        } catch (Exception $e) {}
    }

    // 7. Wagon Fleet Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_wagons (
        id VARCHAR(100) PRIMARY KEY,
        wagonType VARCHAR(100) DEFAULT 'Covered Hopper Wagon',
        payloadCapacity VARCHAR(100) DEFAULT '60 MT (1,200 Bags)',
        capacity INT DEFAULT 1200,
        status VARCHAR(50) DEFAULT 'AVAILABLE',
        currentStation VARCHAR(50) DEFAULT 'EWK',
        gauge VARCHAR(50) DEFAULT 'STANDARD_GAUGE',
        addedBy VARCHAR(255) DEFAULT 'System Registry',
        createdAt VARCHAR(100)
    )");

    // 8. Notifications Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_notifications (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        body TEXT,
        time VARCHAR(100),
        type VARCHAR(100),
        targetId VARCHAR(200),
        targetTab VARCHAR(100),
        readInt INT DEFAULT 0
    )");

    // 9. Role Permissions Matrix Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_role_permissions (
        roleKey VARCHAR(100) PRIMARY KEY,
        permissionsJson TEXT NOT NULL,
        updatedAt VARCHAR(100)
    )");

    // 10. System Settings Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_system_settings (
        settingKey VARCHAR(100) PRIMARY KEY,
        settingValue TEXT NOT NULL,
        updatedAt VARCHAR(100)
    )");

    // 11. Commercial Freight Invoices & Debit Notes Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_invoices (
        id VARCHAR(100) PRIMARY KEY,
        invoiceNumber VARCHAR(100),
        tripId VARCHAR(100),
        dealId VARCHAR(100),
        companyName VARCHAR(255),
        clientEmail VARCHAR(255),
        cargoType VARCHAR(255),
        route VARCHAR(255),
        totalBags INT DEFAULT 0,
        totalTonnes REAL DEFAULT 0,
        ratePerTonne REAL DEFAULT 0,
        subtotal REAL DEFAULT 0,
        damageUnits INT DEFAULT 0,
        damageDeduction REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        totalAmount REAL DEFAULT 0,
        amountPaid REAL DEFAULT 0,
        balance REAL DEFAULT 0,
        status VARCHAR(50) DEFAULT 'UNPAID',
        paymentRef VARCHAR(100),
        damageDetailsJson TEXT,
        paymentHistoryJson TEXT,
        itemsText TEXT,
        issueDate VARCHAR(100),
        dueDate VARCHAR(100),
        createdAt VARCHAR(100)
    )");

    $invoiceCols = ['tripId', 'clientEmail', 'damageUnits', 'damageDeduction', 'paymentRef', 'damageDetailsJson', 'paymentHistoryJson', 'createdAt'];
    foreach ($invoiceCols as $c) {
        try { $pdo->exec("ALTER TABLE bueno_invoices ADD COLUMN {$c} TEXT"); } catch (Exception $e) {}
    }

    // 12. Direct Trip Operating Costs (COGS) Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_trip_costs (
        id VARCHAR(100) PRIMARY KEY,
        tripId VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        vendor VARCHAR(255),
        amount REAL NOT NULL,
        voucherNo VARCHAR(100),
        paymentStatus VARCHAR(50) DEFAULT 'PAID',
        recordedBy VARCHAR(255),
        date VARCHAR(100),
        createdAt VARCHAR(100)
    )");

    // 13. GPS Logs Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_gps_logs (
        id VARCHAR(100) PRIMARY KEY,
        tripId VARCHAR(100),
        locomotiveId VARCHAR(100),
        lat REAL,
        lng REAL,
        speed INT DEFAULT 0,
        heading REAL DEFAULT 0,
        accuracy REAL DEFAULT 3,
        batteryLevel INT DEFAULT 100,
        officerPhone VARCHAR(50),
        signalQuality VARCHAR(50) DEFAULT 'MOBILE_PHONE_GPS_LIVE',
        timestamp VARCHAR(100)
    )");

    // Seed 46 Dedicated Covered Hopper Wagons if empty
    $wStmt = $pdo->query("SELECT COUNT(*) as cnt FROM bueno_wagons");
    $wRow = $wStmt->fetch();
    if ($wRow && $wRow['cnt'] == 0) {
        $wInsert = $pdo->prepare("INSERT INTO bueno_wagons (id, wagonType, payloadCapacity, capacity, status, currentStation, gauge, addedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $date = date('d/m/Y');
        for ($i = 1; $i <= 46; $i++) {
            $num = str_pad($i, 4, '0', STR_PAD_LEFT);
            $wId = "PXG " . $num;
            $isEwk = ($i % 2 === 0);
            $station = $isEwk ? 'EWK' : 'MNY';
            $wInsert->execute([$wId, 'Covered Hopper Wagon', '60 MT (1,200 Bags)', 1200, 'AVAILABLE', $station, 'STANDARD_GAUGE', 'System Registry', $date]);
        }
    }

    // Seed default users if empty
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM bueno_users");
    $row = $stmt->fetch();
    if ($row && $row['cnt'] == 0) {
        $defaultUsers = [
            ['usr_1', 'Ade Bello', 'ade.bello@bueno.ng', '08031112233', 'CARGO_OFFICER', 'STAFF', 'EWK', NULL, 'EWK-01', '1111', 'ACTIVE'],
            ['usr_2', 'Samuel Okafor', 'samuel.okafor@bueno.ng', '08032223344', 'CARGO_OFFICER', 'STAFF', 'EWK', NULL, 'EWK-02', '2222', 'ACTIVE'],
            ['usr_3', 'Musa Ibrahim', 'musa.ibrahim@bueno.ng', '08034445566', 'CARGO_OFFICER', 'STAFF', 'MNY', NULL, 'MNY-01', '1111', 'ACTIVE'],
            ['usr_7', 'Alhaji Bashir Umar', 'ceo@bueno.ng', '08030000001', 'CEO', 'STAFF', 'HQ', NULL, 'EXEC-01', '9999', 'ACTIVE'],
            ['usr_8', 'Babajide Sanwo', 'ops.command@bueno.ng', '08030000002', 'HEAD_OF_OPERATIONS', 'STAFF', 'HQ', NULL, 'EXEC-02', '8888', 'ACTIVE'],
            ['usr_9', 'Folake Adeyemi', 'admin@bueno.ng', '08030000003', 'ADMIN', 'STAFF', 'HQ', NULL, 'EXEC-03', '7777', 'ACTIVE'],
            ['usr_10', 'Chinenye Nnamdi', 'finance@bueno.ng', '08030000004', 'HEAD_OF_FINANCE', 'STAFF', 'HQ', NULL, 'EXEC-04', '6666', 'ACTIVE'],
            ['usr_11', 'Huaxin Logistics Desk', 'logistics@hbm.ng', '08037778899', 'CUSTOMER', 'CUSTOMER', NULL, 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)', 'CUST-01', '1111', 'ACTIVE'],
            ['usr_12', 'Dangote Freight Team', 'freight@dangotecement.ng', '08038889900', 'CUSTOMER', 'CUSTOMER', NULL, 'Dangote Cement', 'CUST-02', '1111', 'ACTIVE'],
            ['usr_13', 'Purechem Cement Team', 'logistics@purechem.ng', '08031234567', 'CUSTOMER', 'CUSTOMER', NULL, 'Purechem Cement Industries Ltd', 'CUST-03', '1111', 'ACTIVE'],
        ];
        $insert = $pdo->prepare("INSERT INTO bueno_users (id, fullName, email, phone, role, userType, assignedStation, companyName, staffId, pin, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $date = date('d/m/Y');
        foreach ($defaultUsers as $u) {
            $insert->execute([$u[0], $u[1], $u[2], $u[3], $u[4], $u[5], $u[6], $u[7], $u[8], $u[9], $u[10], $date]);
        }
    }

    // Automatically sanitize and migrate any legacy Lafarge or Elephant references across SQL tables
    try {
        $pdo->exec("UPDATE bueno_users SET companyName = 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)', fullName = 'Huaxin Logistics Desk', email = 'logistics@hbm.ng' WHERE companyName LIKE '%Lafarge%' OR email LIKE '%lafarge%'");
        $pdo->exec("UPDATE bueno_deals SET company = 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)', cargoType = 'Huaxin Portland Cement (50kg)' WHERE company LIKE '%Lafarge%' OR cargoType LIKE '%Elephant%'");
        $pdo->exec("UPDATE bueno_trips SET company = 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)', cargoType = 'Huaxin Portland Cement (50kg bags)' WHERE company LIKE '%Lafarge%' OR cargoType LIKE '%Elephant%'");
        $pdo->exec("UPDATE bueno_invoices SET company = 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)' WHERE company LIKE '%Lafarge%'");
    } catch (Exception $e) {}
}
