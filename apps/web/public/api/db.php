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

    try {
        if ($dbPass !== '') {
            $pdo = new PDO("mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        } else {
            $sqlitePath = __DIR__ . '/bueno.sqlite';
            $pdo = new PDO("sqlite:" . $sqlitePath, null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        }
    } catch (PDOException $e) {
        $sqlitePath = __DIR__ . '/bueno.sqlite';
        $pdo = new PDO("sqlite:" . $sqlitePath, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }

    initTables($pdo);
    return $pdo;
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
        createdBy VARCHAR(255),
        createdAt VARCHAR(100)
    )");

    // 5. Trips & GPS Telemetry Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_trips (
        id VARCHAR(100) PRIMARY KEY,
        tripId VARCHAR(100),
        locomotiveId VARCHAR(100),
        cargoOfficerName VARCHAR(255),
        company VARCHAR(255),
        cargoType VARCHAR(255),
        quantity VARCHAR(100),
        origin VARCHAR(50),
        destination VARCHAR(50),
        status VARCHAR(50),
        curLat REAL,
        curLng REAL,
        wagonLogsText TEXT,
        createdAt VARCHAR(100)
    )");

    // 6. Fund Requests & Approval Conversations Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_fund_requests (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        officerName VARCHAR(255),
        station VARCHAR(50),
        amount REAL,
        category VARCHAR(100),
        description TEXT,
        stage VARCHAR(100),
        conversationText TEXT,
        paymentDetailsText TEXT,
        date VARCHAR(100)
    )");

    // 7. Wagon Fleet Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_wagons (
        id VARCHAR(100) PRIMARY KEY,
        capacity INT,
        status VARCHAR(50),
        currentStation VARCHAR(50),
        addedBy VARCHAR(255),
        createdAt VARCHAR(100)
    )");

    // 8. Notifications Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_notifications (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        body TEXT,
        time VARCHAR(100),
        type VARCHAR(100),
        readInt INT DEFAULT 0
    )");

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
            ['usr_11', 'Lafarge Logistics Desk', 'logistics@lafarge.ng', '08037778899', 'CUSTOMER', 'CUSTOMER', NULL, 'Lafarge Africa Plc', 'CUST-01', '1111', 'ACTIVE'],
            ['usr_12', 'Dangote Freight Team', 'freight@dangotecement.ng', '08038889900', 'CUSTOMER', 'CUSTOMER', NULL, 'Dangote Cement', 'CUST-02', '1111', 'ACTIVE'],
            ['usr_13', 'Purechem Cement Team', 'logistics@purechem.ng', '08031234567', 'CUSTOMER', 'CUSTOMER', NULL, 'Purechem Cement Industries Ltd', 'CUST-03', '1111', 'ACTIVE'],
        ];
        $insert = $pdo->prepare("INSERT INTO bueno_users (id, fullName, email, phone, role, userType, assignedStation, companyName, staffId, pin, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $date = date('d/m/Y');
        foreach ($defaultUsers as $u) {
            $insert->execute([$u[0], $u[1], $u[2], $u[3], $u[4], $u[5], $u[6], $u[7], $u[8], $u[9], $u[10], $date]);
        }
    }
}
