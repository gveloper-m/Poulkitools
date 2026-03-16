<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../config.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_all') {
        // Get all products
        $stmt = $pdo->prepare("SELECT id, unique_id, name, category, price_with_vat, image, instock FROM products ORDER BY name ASC LIMIT 100");
        $stmt->execute();
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $products]);
    }
    elseif ($method === 'GET' && isset($_GET['id'])) {
        // Get single product
        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$_GET['id']]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Product not found']);
            exit;
        }
        
        echo json_encode(['success' => true, 'data' => $product]);
    }
    elseif ($method === 'POST') {
        // Create new product
        $name = $_POST['name'] ?? '';
        $category = $_POST['category'] ?? '';
        $cat_id = $_POST['cat_id'] ?? null;
        
        // Handle custom category IDs - remove 'custom_' prefix if present
        if ($cat_id && trim($cat_id) !== '') {
            if (strpos($cat_id, 'custom_') === 0) {
                $cat_id = (int)substr($cat_id, 7); // Extract numeric ID
            } else {
                $cat_id = (int)$cat_id; // Ensure it's an integer for imported categories
            }
        } else {
            $cat_id = null; // If empty, set to NULL
        }
        
        $price_with_vat = $_POST['price_with_vat'] ?? 0;
        $description = $_POST['description'] ?? '';
        $model = $_POST['model'] ?? '';
        $manufacturer = $_POST['manufacturer'] ?? '';
        $weight = $_POST['weight'] ?? '';
        $mpa = $_POST['mpa'] ?? '';
        $gan = $_POST['gan'] ?? '';
        $link = $_POST['link'] ?? '';
        $quantity = $_POST['quantity'] ?? 0;
        $instock = $_POST['instock'] ?? 'Yes';
        $thursday_price = $_POST['thursday_price'] ?? null;
        $unique_id = $_POST['unique_id'] ?? '';
        
        if (!$name || !$price_with_vat) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Name and price are required']);
            exit;
        }
        
        // Handle image upload
        $image = '';
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = '../../uploads/products/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            $filename = time() . '_' . basename($_FILES['image']['name']);
            $filepath = $uploadDir . $filename;
            
            if (move_uploaded_file($_FILES['image']['tmp_name'], $filepath)) {
                $image = 'uploads/products/' . $filename;
            }
        }
        
        // Generate unique_id if not provided
        if (!$unique_id) {
            $unique_id = 'PROD_' . time() . '_' . rand(1000, 9999);
        }
        
        $stmt = $pdo->prepare("INSERT INTO products 
            (unique_id, name, description, model, link, image, category, cat_id, price_with_vat, 
             thursday_price, manufacturer, mpa, gan, weight, instock, quantity) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $stmt->execute([
            $unique_id, $name, $description, $model, $link, $image, $category, $cat_id,
            $price_with_vat, $thursday_price, $manufacturer, $mpa, $gan, $weight, $instock, $quantity
        ]);
        
        $newId = $pdo->lastInsertId();
        echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Product created successfully']);
    }
    elseif ($method === 'POST' && isset($_POST['_method']) && $_POST['_method'] === 'PUT') {
        // Update product
        $id = $_POST['id'] ?? null;
        
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Product ID is required']);
            exit;
        }
        
        // Get existing product
        $stmt = $pdo->prepare("SELECT image FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Product not found']);
            exit;
        }
        
        $image = $product['image'];
        
        // Handle image upload
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            // Delete old image if exists
            if ($image && file_exists('../../' . $image)) {
                unlink('../../' . $image);
            }
            
            $uploadDir = '../../uploads/products/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            $filename = time() . '_' . basename($_FILES['image']['name']);
            $filepath = $uploadDir . $filename;
            
            if (move_uploaded_file($_FILES['image']['tmp_name'], $filepath)) {
                $image = 'uploads/products/' . $filename;
            }
        }
        
        $name = $_POST['name'] ?? '';
        $category = $_POST['category'] ?? '';
        $cat_id = $_POST['cat_id'] ?? null;
        $price_with_vat = $_POST['price_with_vat'] ?? 0;
        $description = $_POST['description'] ?? '';
        $model = $_POST['model'] ?? '';
        $manufacturer = $_POST['manufacturer'] ?? '';
        $weight = $_POST['weight'] ?? '';
        $mpa = $_POST['mpa'] ?? '';
        $gan = $_POST['gan'] ?? '';
        $link = $_POST['link'] ?? '';
        $quantity = $_POST['quantity'] ?? 0;
        $instock = $_POST['instock'] ?? 'Yes';
        $thursday_price = $_POST['thursday_price'] ?? null;
        
        $stmt = $pdo->prepare("UPDATE products SET 
            name = ?, description = ?, model = ?, link = ?, image = ?, category = ?, cat_id = ?, 
            price_with_vat = ?, thursday_price = ?, manufacturer = ?, mpa = ?, gan = ?, weight = ?, 
            instock = ?, quantity = ? WHERE id = ?");
        
        $stmt->execute([
            $name, $description, $model, $link, $image, $category, $cat_id,
            $price_with_vat, $thursday_price, $manufacturer, $mpa, $gan, $weight, $instock, $quantity, $id
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Product updated successfully']);
    }
    elseif ($method === 'DELETE') {
        // Delete product
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Product ID is required']);
            exit;
        }
        
        // Get product image
        $stmt = $pdo->prepare("SELECT image FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($product && $product['image'] && file_exists('../../' . $product['image'])) {
            unlink('../../' . $product['image']);
        }
        
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true, 'message' => 'Product deleted successfully']);
    }
    else {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
