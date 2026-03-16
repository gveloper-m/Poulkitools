<?php
require_once '../config.php';

// Handle cart operations
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    
    $action = $_POST['action'] ?? '';
    
    if ($action === 'add_to_cart') {
        $productId = $_POST['product_id'] ?? null;
        $quantity = (int)($_POST['quantity'] ?? 1);
        
        if (!$productId || $quantity < 1) {
            echo json_encode(['error' => 'Invalid product or quantity']);
            exit;
        }
        
        // Verify product exists and check stock
        $stmt = $pdo->prepare('SELECT id, name, price_with_vat, thursday_price, quantity FROM products WHERE id = ?');
        $stmt->execute([$productId]);
        $product = $stmt->fetch();
        
        if (!$product) {
            echo json_encode(['error' => 'Product not found']);
            exit;
        }
        
        if ($product['quantity'] < $quantity) {
            echo json_encode(['error' => 'Insufficient stock']);
            exit;
        }
        
        // Get or create cart in session
        if (!isset($_SESSION['cart'])) {
            $_SESSION['cart'] = [];
        }
        
        $price = $product['thursday_price'] > 0 ? $product['thursday_price'] : $product['price_with_vat'];
        $price = applyXMLMarkup($price);
        
        if (isset($_SESSION['cart'][$productId])) {
            $_SESSION['cart'][$productId]['quantity'] += $quantity;
        } else {
            $_SESSION['cart'][$productId] = [
                'id' => $productId,
                'name' => $product['name'],
                'price' => $price,
                'quantity' => $quantity
            ];
        }
        
        echo json_encode(['success' => true, 'cart_count' => count($_SESSION['cart'])]);
        exit;
    }
    
    if ($action === 'update_cart') {
        $items = $_POST['items'] ?? [];
        $_SESSION['cart'] = [];
        
        foreach ($items as $productId => $data) {
            $quantity = (int)$data['quantity'];
            if ($quantity > 0) {
                $_SESSION['cart'][$productId] = [
                    'id' => $productId,
                    'name' => $data['name'],
                    'price' => $data['price'],
                    'quantity' => $quantity
                ];
            }
        }
        
        echo json_encode(['success' => true]);
        exit;
    }
    
    if ($action === 'remove_from_cart') {
        $productId = $_POST['product_id'] ?? null;
        if ($productId && isset($_SESSION['cart'][$productId])) {
            unset($_SESSION['cart'][$productId]);
        }
        echo json_encode(['success' => true]);
        exit;
    }
    
    if ($action === 'get_cart') {
        $cart = $_SESSION['cart'] ?? [];
        $total = 0;
        foreach ($cart as $item) {
            $total += $item['price'] * $item['quantity'];
        }
        echo json_encode(['items' => $cart, 'total' => $total]);
        exit;
    }
}

http_response_code(400);
echo json_encode(['error' => 'Invalid request']);
?>
