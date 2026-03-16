<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../config.php';

// Create table for category visibility if it doesn't exist
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'init_table') {
    try {
        $pdo->exec('CREATE TABLE IF NOT EXISTS category_visibility (
            cat_id INT PRIMARY KEY,
            category VARCHAR(255) NOT NULL,
            visible BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )');
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// Get all categories with their visibility status
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_categories') {
    try {
        // Get imported categories from products table
        $stmt = $pdo->query('SELECT DISTINCT cat_id, category FROM products ORDER BY category');
        $importedCategories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get custom categories from categories table
        $stmt = $pdo->query('SELECT id, name as category FROM categories ORDER BY name');
        $customCategories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get current visibility settings
        $stmt = $pdo->query('SELECT cat_id, category, visible FROM category_visibility ORDER BY category');
        $visibilityMap = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            // Convert cat_id to string key for consistency
            $keyId = (string)(int)$row['cat_id'];
            $visibilityMap[$keyId] = ['category' => $row['category'], 'visible' => (bool)$row['visible']];
        }
        
        // Combine both imported and custom categories
        $result = [];
        
        // Process imported categories
        foreach ($importedCategories as $cat) {
            $cat_id = $cat['cat_id'];
            $keyId = (string)(int)$cat_id;
            if (isset($visibilityMap[$keyId])) {
                $result[] = [
                    'cat_id' => $cat_id,
                    'category' => $cat['category'],
                    'visible' => $visibilityMap[$keyId]['visible']
                ];
            } else {
                // New category, add it as visible by default
                try {
                    $insertStmt = $pdo->prepare('INSERT INTO category_visibility (cat_id, category, visible) VALUES (?, ?, TRUE)');
                    $insertStmt->execute([$cat_id, $cat['category']]);
                } catch (Exception $e) {
                    // Might be duplicate if another request inserted it
                }
                $result[] = [
                    'cat_id' => $cat_id,
                    'category' => $cat['category'],
                    'visible' => true
                ];
            }
        }
        
        // Process custom categories (use id as cat_id)
        foreach ($customCategories as $cat) {
            $customNumericId = (int)$cat['id']; // Store numeric ID for database
            $keyId = (string)$customNumericId;
            $cat_id = 'custom_' . $cat['id']; // Use formatted ID for API response
            $cat_name = $cat['category'];
            
            // Look up visibility using numeric ID
            if (isset($visibilityMap[$keyId])) {
                $result[] = [
                    'cat_id' => $cat_id,
                    'category' => $cat_name,
                    'visible' => $visibilityMap[$keyId]['visible']
                ];
            } else {
                // New custom category, add it as visible by default
                try {
                    $insertStmt = $pdo->prepare('INSERT INTO category_visibility (cat_id, category, visible) VALUES (?, ?, TRUE)');
                    $insertStmt->execute([$customNumericId, $cat_name]); // Insert numeric ID only
                } catch (Exception $e) {
                    // Might be duplicate if another request inserted it
                }
                $result[] = [
                    'cat_id' => $cat_id,
                    'category' => $cat_name,
                    'visible' => true
                ];
            }
        }
        
        echo json_encode($result);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// Save category visibility
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'save_visibility') {
    try {
        $visibilityData = isset($_POST['visibility']) ? json_decode($_POST['visibility'], true) : [];
        
        if (!is_array($visibilityData)) {
            throw new Exception('Invalid visibility data format');
        }
        
        // Convert all cat_ids to numeric format first
        $numericCatIds = [];
        $processedData = [];
        
        foreach ($visibilityData as $item) {
            $cat_id = $item['cat_id'];
            $visible = $item['visible'] ? 1 : 0;
            
            // Extract numeric ID from custom_ format or use as-is if numeric
            $numericCatId = $cat_id;
            if (strpos($cat_id, 'custom_') === 0) {
                $numericCatId = (int)substr($cat_id, 7);
            } elseif (is_numeric($cat_id)) {
                $numericCatId = (int)$cat_id;
            } else {
                // Skip invalid IDs
                continue;
            }
            
            $numericCatIds[] = $numericCatId;
            $processedData[] = [
                'cat_id' => $numericCatId,
                'category' => $item['category'],
                'visible' => $visible
            ];
        }
        
        // Clear ALL old visibility settings first
        $pdo->query('DELETE FROM category_visibility');
        
        // Insert ONLY the categories from the POST data (which includes both visible=1 and visible=0)
        // This ensures hidden categories are properly marked as visible=0 OR not present
        foreach ($processedData as $item) {
            $stmt = $pdo->prepare('INSERT INTO category_visibility (cat_id, category, visible) VALUES (?, ?, ?)');
            $stmt->execute([$item['cat_id'], $item['category'], $item['visible']]);
        }
        
        echo json_encode(['success' => true, 'message' => 'Visibility settings saved']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// Get hidden categories list (for frontend filtering)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_hidden') {
    try {
        $stmt = $pdo->query('SELECT cat_id FROM category_visibility WHERE visible = FALSE');
        $hidden = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo json_encode(['hidden_categories' => $hidden]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// ============ NEW CATEGORY MANAGEMENT ENDPOINTS ============

// Create categories table for CRUD operations
$migrationSQL = "CREATE TABLE IF NOT EXISTS `categories` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL UNIQUE,
    `slug` VARCHAR(255) UNIQUE,
    `description` TEXT,
    `parent_id` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

try {
    $pdo->exec($migrationSQL);
} catch (Exception $e) {
    // Table might already exist
}

// Get all custom categories (not from products table)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'list') {
    try {
        $stmt = $pdo->prepare("
            SELECT c.id, c.name, c.slug, c.description, c.parent_id, p.name as parent_name
            FROM categories c
            LEFT JOIN categories p ON c.parent_id = p.id
            ORDER BY c.parent_id, c.name ASC
        ");
        $stmt->execute();
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $categories]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// Create new category
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'create') {
    try {
        $name = trim($_POST['name'] ?? '');
        
        if (!$name) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Category name is required']);
            exit;
        }
        
        $slug = isset($_POST['slug']) ? trim($_POST['slug']) : strtolower(preg_replace('/[^a-z0-9]+/', '-', $name));
        $description = isset($_POST['description']) ? trim($_POST['description']) : '';
        
        // Only accept custom category parents (not imported ones)
        // If they selected an imported category, ignore it and create as top-level
        $parentId = null;
        if (isset($_POST['parent_id']) && $_POST['parent_id']) {
            $parentValue = $_POST['parent_id'];
            // Only process if it's a custom category (doesn't start with 'imported_')
            if (!strpos($parentValue, 'imported_') === 0) {
                $parentId = (int)$parentValue;
                if ($parentId <= 0) {
                    $parentId = null;
                }
            }
        }
        
        // Check if category already exists
        $checkStmt = $pdo->prepare("SELECT id FROM categories WHERE name = ? OR slug = ?");
        $checkStmt->execute([$name, $slug]);
        if ($checkStmt->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'Category already exists']);
            exit;
        }
        
        $stmt = $pdo->prepare("INSERT INTO categories (name, slug, description, parent_id) VALUES (?, ?, ?, ?)");
        $stmt->execute([$name, $slug, $description, $parentId]);
        
        $newId = $pdo->lastInsertId();
        echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Category created successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// Update category
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update') {
    try {
        $id = $_POST['id'] ?? null;
        $name = trim($_POST['name'] ?? '');
        
        if (!$id || !$name) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID and name are required']);
            exit;
        }
        
        $slug = isset($_POST['slug']) ? trim($_POST['slug']) : strtolower(preg_replace('/[^a-z0-9]+/', '-', $name));
        $description = isset($_POST['description']) ? trim($_POST['description']) : '';
        $parentId = isset($_POST['parent_id']) && $_POST['parent_id'] ? (int)$_POST['parent_id'] : null;
        
        // Prevent a category from being its own parent
        if ($parentId === (int)$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'A category cannot be its own parent']);
            exit;
        }
        
        $stmt = $pdo->prepare("UPDATE categories SET name = ?, slug = ?, description = ?, parent_id = ? WHERE id = ?");
        $stmt->execute([$name, $slug, $description, $parentId, $id]);
        
        echo json_encode(['success' => true, 'message' => 'Category updated successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// Delete category
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'delete') {
    try {
        $id = $_POST['id'] ?? null;
        
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Category ID is required']);
            exit;
        }
        
        $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true, 'message' => 'Category deleted successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// Invalid request
http_response_code(400);
echo json_encode(['error' => 'Invalid request']);
?>
