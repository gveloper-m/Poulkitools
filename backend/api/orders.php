<?php
require_once '../config.php';

header('Content-Type: application/json');

// Auto-migrate: Add missing columns to orders table if they don't exist
try {
    $pdo->exec('ALTER TABLE orders ADD COLUMN customer_city VARCHAR(255) AFTER customer_address');
} catch (PDOException $e) {
    // Column already exists or other error, continue
}

try {
    $pdo->exec('ALTER TABLE orders ADD COLUMN customer_state VARCHAR(255) AFTER customer_city');
} catch (PDOException $e) {
    // Column already exists or other error, continue
}

try {
    $pdo->exec('ALTER TABLE orders ADD COLUMN customer_postal_code VARCHAR(20) AFTER customer_state');
} catch (PDOException $e) {
    // Column already exists or other error, continue
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'place_order') {
        if (empty($_SESSION['cart'])) {
            echo json_encode(['error' => 'Cart is empty']);
            exit;
        }
        
        $customerName = $_POST['customer_name'] ?? '';
        $customerEmail = $_POST['customer_email'] ?? '';
        $customerPhone = $_POST['customer_phone'] ?? '';
        $customerAddress = $_POST['customer_address'] ?? '';
        $customerCity = $_POST['customer_city'] ?? '';
        $customerState = $_POST['customer_state'] ?? '';
        $customerPostalCode = $_POST['customer_postal_code'] ?? '';
        $shippingMethodId = $_POST['shipping_method_id'] ?? null;
        $paymentMethodId = $_POST['payment_method_id'] ?? null;
        
        if (!$customerName || !$customerEmail || !$customerPhone || !$customerAddress || !$customerCity || !$customerState || !$customerPostalCode || !$shippingMethodId || !$paymentMethodId) {
            echo json_encode(['error' => 'Missing required fields']);
            exit;
        }
        
        // Calculate total
        $total = 0;
        $items = [];
        foreach ($_SESSION['cart'] as $item) {
            $total += $item['price'] * $item['quantity'];
            $items[] = $item;
        }
        
        // Get shipping cost
        $shippingStmt = $pdo->prepare('SELECT cost FROM shipping_methods WHERE id = ?');
        $shippingStmt->execute([$shippingMethodId]);
        $shipping = $shippingStmt->fetch();
        
        if ($shipping) {
            $total += $shipping['cost'];
        }
        
        // Get payment method cost
        $paymentStmt = $pdo->prepare('SELECT cost FROM payment_methods WHERE id = ?');
        $paymentStmt->execute([$paymentMethodId]);
        $payment = $paymentStmt->fetch();
        
        if ($payment) {
            $total += $payment['cost'];
        }
        
        $orderCode = generateOrderCode();
        $itemsJson = json_encode($items);
        
        try {
            $stmt = $pdo->prepare('
                INSERT INTO orders (
                    order_code, customer_name, customer_email, customer_phone, 
                    customer_address, customer_city, customer_state, customer_postal_code,
                    shipping_method_id, payment_method_id, 
                    total_amount, items, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            
            $stmt->execute([
                $orderCode, $customerName, $customerEmail, $customerPhone,
                $customerAddress, $customerCity, $customerState, $customerPostalCode,
                $shippingMethodId, $paymentMethodId,
                $total, $itemsJson, 'pending'
            ]);
            
            // Clear cart
            unset($_SESSION['cart']);
            
            echo json_encode([
                'success' => true, 
                'order_code' => $orderCode,
                'total' => $total
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to place order']);
        }
        exit;
    }
    
    if ($action === 'get_shipping_methods') {
        $stmt = $pdo->query('SELECT * FROM shipping_methods ORDER BY name');
        $methods = $stmt->fetchAll();
        echo json_encode($methods);
        exit;
    }
    
    if ($action === 'get_payment_methods') {
        $stmt = $pdo->query('SELECT * FROM payment_methods ORDER BY name');
        $methods = $stmt->fetchAll();
        echo json_encode($methods);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'get_order') {
        $orderCode = $_GET['order_code'] ?? '';
        $email = $_GET['email'] ?? '';
        
        if (!$email) {
            echo json_encode(['error' => 'Email is required']);
            exit;
        }
        
        // If only email is provided, return all orders for that email
        if (!$orderCode) {
            $stmt = $pdo->prepare('
                SELECT id, order_code, customer_name, customer_email, customer_phone,
                       customer_address, customer_city, customer_state, customer_postal_code,
                       shipping_method_id, payment_method_id, 
                       total_amount, status, tracking_code, notes, items, created_at
                FROM orders
                WHERE customer_email = ?
                ORDER BY created_at DESC
            ');
            
            $stmt->execute([$email]);
            $orders = $stmt->fetchAll();
            
            if (!$orders) {
                echo json_encode(['error' => 'No orders found for this email']);
                exit;
            }
            
            // Process orders
            foreach ($orders as &$order) {
                $order['items'] = json_decode($order['items'], true);
            }
            
            echo json_encode(['success' => true, 'orders' => $orders]);
            exit;
        }
        
        // If both email and order code provided, return specific order
        $stmt = $pdo->prepare('
            SELECT id, order_code, customer_name, customer_email, customer_phone,
                   customer_address, customer_city, customer_state, customer_postal_code,
                   shipping_method_id, payment_method_id, 
                   total_amount, status, tracking_code, notes, items, created_at
            FROM orders
            WHERE order_code = ? AND customer_email = ?
        ');
        
        $stmt->execute([$orderCode, $email]);
        $order = $stmt->fetch();
        
        if (!$order) {
            echo json_encode(['error' => 'Order not found']);
            exit;
        }
        
        // Decode items
        $order['items'] = json_decode($order['items'], true);
        
        // Get shipping method details
        if ($order['shipping_method_id']) {
            $shippingStmt = $pdo->prepare('SELECT name, cost FROM shipping_methods WHERE id = ?');
            $shippingStmt->execute([$order['shipping_method_id']]);
            $order['shipping_method'] = $shippingStmt->fetch();
        }
        
        // Get payment method details
        if ($order['payment_method_id']) {
            $paymentStmt = $pdo->prepare('SELECT name FROM payment_methods WHERE id = ?');
            $paymentStmt->execute([$order['payment_method_id']]);
            $order['payment_method'] = $paymentStmt->fetch();
        }
        
        echo json_encode($order);
        exit;
    }
}

http_response_code(400);
echo json_encode(['error' => 'Invalid request']);
?>
