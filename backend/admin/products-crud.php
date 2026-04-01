<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../config.php';

function decodeExtraImages(?string $value): array {
    if (!$value) {
        return [];
    }

    $decoded = json_decode($value, true);
    return is_array($decoded) ? array_values(array_filter($decoded, fn($item) => !empty($item))) : [];
}

function isLocalProductUpload(string $path): bool {
    return str_starts_with($path, 'uploads/products/');
}

function deleteProductImageFile(?string $path): void {
    if (!$path || !isLocalProductUpload($path)) {
        return;
    }

    $fullPath = '../../' . $path;
    if (file_exists($fullPath)) {
        unlink($fullPath);
    }
}

function ensureProductUploadDir(): string {
    $uploadDir = '../../uploads/products/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    return $uploadDir;
}

function uploadProductImage(array $file): ?string {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return null;
    }

    $uploadDir = ensureProductUploadDir();
    $filename = time() . '_' . bin2hex(random_bytes(4)) . '_' . basename($file['name']);
    $filepath = $uploadDir . $filename;

    if (move_uploaded_file($file['tmp_name'], $filepath)) {
        return 'uploads/products/' . $filename;
    }

    return null;
}

function normalizeCategoryId($catId): ?int {
    if (!$catId || trim((string)$catId) === '') {
        return null;
    }

    if (strpos((string)$catId, 'custom_') === 0) {
        return (int)substr((string)$catId, 7);
    }

    return (int)$catId;
}

function collectExtraImages(array $existingExtraImages = []): array {
    $extraImages = array_slice(array_values($existingExtraImages), 0, 2);

    foreach (['extra_image_1', 'extra_image_2'] as $index => $fieldName) {
        if (!isset($_FILES[$fieldName])) {
            continue;
        }

        $uploadedPath = uploadProductImage($_FILES[$fieldName]);
        if ($uploadedPath === null) {
            continue;
        }

        if (!empty($extraImages[$index]) && $extraImages[$index] !== $uploadedPath) {
            deleteProductImageFile($extraImages[$index]);
        }

        $extraImages[$index] = $uploadedPath;
    }

    return array_values(array_filter($extraImages, fn($item) => !empty($item)));
}

function shouldRemoveImage(string $fieldName): bool {
    return isset($_POST[$fieldName]) && $_POST[$fieldName] === '1';
}

try {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_all') {
        $stmt = $pdo->prepare("SELECT id, unique_id, name, category, price_with_vat, image, instock FROM products ORDER BY name ASC LIMIT 100");
        $stmt->execute();
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $products]);
    } elseif ($method === 'GET' && isset($_GET['id'])) {
        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$_GET['id']]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Product not found']);
            exit;
        }

        $product['extra_images'] = decodeExtraImages($product['extra_images'] ?? null);
        echo json_encode(['success' => true, 'data' => $product]);
    } elseif ($method === 'POST' && isset($_POST['_method']) && $_POST['_method'] === 'PUT') {
        $id = $_POST['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Product ID is required']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT image, extra_images FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Product not found']);
            exit;
        }

        $image = $product['image'];
        if (shouldRemoveImage('remove_image') && (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK)) {
            deleteProductImageFile($image);
            $image = '';
        }

        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $uploadedMainImage = uploadProductImage($_FILES['image']);
            if ($uploadedMainImage !== null) {
                deleteProductImageFile($image);
                $image = $uploadedMainImage;
            }
        }

        $extraImages = decodeExtraImages($product['extra_images'] ?? null);
        foreach (['remove_extra_image_1', 'remove_extra_image_2'] as $index => $fieldName) {
            if (shouldRemoveImage($fieldName) && !empty($extraImages[$index]) && (!isset($_FILES['extra_image_' . ($index + 1)]) || $_FILES['extra_image_' . ($index + 1)]['error'] !== UPLOAD_ERR_OK)) {
                deleteProductImageFile($extraImages[$index]);
                unset($extraImages[$index]);
            }
        }
        $extraImages = collectExtraImages($extraImages);

        $name = $_POST['name'] ?? '';
        $category = $_POST['category'] ?? '';
        $cat_id = normalizeCategoryId($_POST['cat_id'] ?? null);
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
            instock = ?, quantity = ?, extra_images = ? WHERE id = ?");

        $stmt->execute([
            $name, $description, $model, $link, $image, $category, $cat_id,
            $price_with_vat, $thursday_price, $manufacturer, $mpa, $gan, $weight,
            $instock, $quantity, json_encode($extraImages), $id
        ]);

        echo json_encode(['success' => true, 'message' => 'Product updated successfully']);
    } elseif ($method === 'POST' && isset($_POST['_method']) && $_POST['_method'] === 'DELETE') {
        $id = $_POST['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Product ID is required']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT image, extra_images FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($product) {
            deleteProductImageFile($product['image'] ?? null);
            foreach (decodeExtraImages($product['extra_images'] ?? null) as $extraImage) {
                deleteProductImageFile($extraImage);
            }
        }

        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$id]);

        echo json_encode(['success' => true, 'message' => 'Product deleted successfully']);
    } elseif ($method === 'POST') {
        $name = $_POST['name'] ?? '';
        $category = $_POST['category'] ?? '';
        $cat_id = normalizeCategoryId($_POST['cat_id'] ?? null);
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

        $image = '';
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $uploadedMainImage = uploadProductImage($_FILES['image']);
            if ($uploadedMainImage !== null) {
                $image = $uploadedMainImage;
            }
        }

        $extraImages = collectExtraImages();

        if (!$unique_id) {
            $unique_id = 'PROD_' . time() . '_' . rand(1000, 9999);
        }

        $stmt = $pdo->prepare("INSERT INTO products
            (unique_id, name, description, model, link, image, category, cat_id, price_with_vat,
             thursday_price, manufacturer, mpa, gan, weight, instock, quantity, extra_images, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')");

        $stmt->execute([
            $unique_id, $name, $description, $model, $link, $image, $category, $cat_id,
            $price_with_vat, $thursday_price, $manufacturer, $mpa, $gan, $weight,
            $instock, $quantity, json_encode($extraImages)
        ]);

        $newId = $pdo->lastInsertId();
        echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Product created successfully']);
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
