<?php
require_once '../config.php';

header('Content-Type: application/json');

// Admin login
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['action'] === 'login') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    $settings = getSettings();
    if ($settings && password_verify($password, $settings['admin_password']) && $username === $settings['admin_username']) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_username'] = $username;
        echo json_encode(['success' => true]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
    }
    exit;
}

// Admin logout
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['action'] === 'logout') {
    session_destroy();
    echo json_encode(['success' => true]);
    exit;
}

// Check login for other endpoints
if (!isAdminLoggedIn()) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Get all orders
if ($_GET['action'] === 'get_orders') {
    $page = $_GET['page'] ?? 1;
    $dateFrom = $_GET['date_from'] ?? null;
    $dateTo = $_GET['date_to'] ?? null;
    $limit = 20;

    $pagination = getPagination($page, $limit);

    $query = 'SELECT * FROM orders WHERE 1=1';
    $params = [];

    if ($dateFrom) {
        $query .= ' AND DATE(created_at) >= ?';
        $params[] = $dateFrom;
    }

    if ($dateTo) {
        $query .= ' AND DATE(created_at) <= ?';
        $params[] = $dateTo;
    }

    $query .= ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    $params[] = $pagination['limit'];
    $params[] = $pagination['offset'];

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $orders = $stmt->fetchAll();

    // Count total
    $countQuery = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    $countParams = [];

    if ($dateFrom) {
        $countQuery .= ' AND DATE(created_at) >= ?';
        $countParams[] = $dateFrom;
    }

    if ($dateTo) {
        $countQuery .= ' AND DATE(created_at) <= ?';
        $countParams[] = $dateTo;
    }

    $countStmt = $pdo->prepare($countQuery);
    $countStmt->execute($countParams);
    $total = $countStmt->fetch()['total'];

    echo json_encode([
        'orders' => $orders,
        'total' => $total,
        'page' => $pagination['page'],
        'pages' => ceil($total / $pagination['limit'])
    ]);
    exit;
}

// Get single order
if ($_GET['action'] === 'get_order') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Order ID required']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
    $stmt->execute([$id]);
    $order = $stmt->fetch();

    if (!$order) {
        http_response_code(404);
        echo json_encode(['error' => 'Order not found']);
        exit;
    }

    $order['items'] = json_decode($order['items'], true);
    echo json_encode($order);
    exit;
}

// Update order status
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['action'] === 'update_order_status') {
    $orderId = $_POST['order_id'] ?? null;
    $status = $_POST['status'] ?? null;

    if (!$orderId || !$status) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing parameters']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?');
    $stmt->execute([$status, $orderId]);

    echo json_encode(['success' => true]);
    exit;
}

// Add tracking code
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['action'] === 'add_tracking') {
    $orderId = $_POST['order_id'] ?? null;
    $trackingCode = $_POST['tracking_code'] ?? null;

    if (!$orderId || !$trackingCode) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing parameters']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE orders SET tracking_code = ? WHERE id = ?');
    $stmt->execute([$trackingCode, $orderId]);

    echo json_encode(['success' => true]);
    exit;
}

// Add order notes
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['action'] === 'add_notes') {
    $orderId = $_POST['order_id'] ?? null;
    $notes = $_POST['notes'] ?? null;

    if (!$orderId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing order ID']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE orders SET notes = ? WHERE id = ?');
    $stmt->execute([$notes, $orderId]);

    echo json_encode(['success' => true]);
    exit;
}

// Generate shipping text
if ($_GET['action'] === 'get_shipping_text') {
    $orderId = $_GET['id'] ?? null;
    if (!$orderId) {
        http_response_code(400);
        echo json_encode(['error' => 'Order ID required']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT customer_name, tracking_code, items FROM orders WHERE id = ?');
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();

    if (!$order || !$order['tracking_code']) {
        http_response_code(400);
        echo json_encode(['error' => 'Order or tracking code not found']);
        exit;
    }

    $items = json_decode($order['items'], true);
    $itemsList = '';
    foreach ($items as $item) {
        $itemsList .= "- {$item['name']} (Ποσότητα: {$item['quantity']})\n";
    }

    $text = "Κ. {$order['customer_name']},\n\nΗ παραγγελία σας έχει αποσταλεί με τον παρακάτω κωδικό αποστολής:\n\nΚωδικός Αποστολής: {$order['tracking_code']}\n\nΠροϊόντα:\n{$itemsList}\nΕυχαριστούμε για την αγορά σας!";

    echo json_encode(['text' => $text]);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Invalid request']);
?>
