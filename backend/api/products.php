<?php
require_once '../config.php';

// Increase timeout for XML import
set_time_limit(0);

header('Content-Type: application/json');
header('Connection: keep-alive');
header('X-Accel-Buffering: no');

// Disable output buffering to keep connection alive
if (function_exists('apache_setenv')) {
    apache_setenv('no-gzip', 1);
}
ob_implicit_flush(1);

// API endpoint for importing XML products
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['action'] === 'import_xml') {
    // Removed auth check for XML import
    
    // Increase timeout for large XML imports
    set_time_limit(0); // Unlimited time
    ini_set('max_execution_time', 0);
    
    $xmlUrl = 'https://www.americat.gr/allproducts.xml';
    
    try {
        // Optimize MySQL for bulk insert
        $pdo->query('SET foreign_key_checks = 0');
        $pdo->query('SET unique_checks = 0');
        $pdo->query('SET autocommit = 0');
        
        // Don't delete products - we'll update existing ones and add new ones
        
        $pdo->commit();
        
        $xmlContent = @file_get_contents($xmlUrl);
        if (!$xmlContent) {
            throw new Exception('Failed to fetch XML');
        }
        
        // Send heartbeat to keep connection alive
        if (function_exists('flush')) {
            echo json_encode(['status' => 'parsing_xml']) . "\n";
            flush();
        }

        $xml = @simplexml_load_string($xmlContent);
        if (!$xml) {
            throw new Exception('Invalid XML format');
        }

        $importedCount = 0;
        $batchSize = 1000; // Insert 1000 products at a time for faster bulk import
        $productsBatch = [];
        $valueStrings = [];
        $params = [];
        
        foreach ($xml->products->product as $product) {
            $uniqueId = (string)$product->UniqueID;
            $name = trim((string)$product->name);
            $description = trim((string)$product->description);
            $model = trim((string)$product->model);
            $link = trim((string)$product->link);
            $image = trim((string)$product->image);
            $category = trim((string)$product->category);
            $catId = trim((string)$product->cat_id);
            $priceWithVat = (float)$product->price_with_vat ?? 0;
            $thursdayPrice = !empty((string)$product->thursday_price) ? (float)$product->thursday_price : 0;
            $manufacturer = trim((string)$product->manufacturer);
            $mpn = trim((string)$product->mpn);
            $ean = trim((string)$product->ean);
            $weight = trim((string)$product->weight);
            $instock = trim((string)$product->instock);
            $availability = trim((string)$product->availability);
            $quantity = (int)$product->quantity ?? 0;
            
            // Handle extra images
            $extraImages = '[]';
            if (isset($product->extra_images) && isset($product->extra_images->image)) {
                $images = [];
                foreach ($product->extra_images->image as $img) {
                    $imgUrl = trim((string)$img);
                    if (!empty($imgUrl)) {
                        $images[] = $imgUrl;
                    }
                }
                $extraImages = json_encode($images);
            }

            // Add to batch
            $valueStrings[] = '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            $params[] = $uniqueId;
            $params[] = $name;
            $params[] = $description;
            $params[] = $model;
            $params[] = $link;
            $params[] = $image;
            $params[] = $category;
            $params[] = $catId;
            $params[] = $priceWithVat;
            $params[] = $thursdayPrice;
            $params[] = $manufacturer;
            $params[] = $mpn;
            $params[] = $ean;
            $params[] = $weight;
            $params[] = $instock;
            $params[] = $availability;
            $params[] = $quantity;
            $params[] = $extraImages;
            $params[] = 'xml';
            
            $importedCount++;
            
            // Execute batch insert every $batchSize products
            if ($importedCount % $batchSize == 0) {
                $sql = 'INSERT INTO products (
                    unique_id, name, description, model, link, image, 
                    category, cat_id, price_with_vat, thursday_price, 
                    manufacturer, mpa, gan, weight, instock, availability, 
                    quantity, extra_images, source
                ) VALUES ' . implode(',', $valueStrings) . '
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    description = VALUES(description),
                    model = VALUES(model),
                    link = VALUES(link),
                    image = VALUES(image),
                    category = VALUES(category),
                    cat_id = VALUES(cat_id),
                    price_with_vat = VALUES(price_with_vat),
                    thursday_price = VALUES(thursday_price),
                    manufacturer = VALUES(manufacturer),
                    mpa = VALUES(mpa),
                    gan = VALUES(gan),
                    weight = VALUES(weight),
                    instock = VALUES(instock),
                    availability = VALUES(availability),
                    quantity = VALUES(quantity),
                    extra_images = VALUES(extra_images)';
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                
                // Commit this batch
                $pdo->commit();
                
                // Send periodic heartbeat to keep nginx connection alive
                if (function_exists('flush')) {
                    echo json_encode(['status' => 'importing', 'imported' => $importedCount]) . "\n";
                    flush();
                    ob_flush();
                }
                
                // Start new transaction for next batch
                $pdo->query('SET autocommit = 0');
                
                // Reset batch
                $valueStrings = [];
                $params = [];
            }
        }
        
        // Insert remaining products
        if (!empty($valueStrings)) {
            $sql = 'INSERT INTO products (
                unique_id, name, description, model, link, image, 
                category, cat_id, price_with_vat, thursday_price, 
                manufacturer, mpa, gan, weight, instock, availability, 
                quantity, extra_images, source
            ) VALUES ' . implode(',', $valueStrings) . '
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                description = VALUES(description),
                model = VALUES(model),
                link = VALUES(link),
                image = VALUES(image),
                category = VALUES(category),
                cat_id = VALUES(cat_id),
                price_with_vat = VALUES(price_with_vat),
                thursday_price = VALUES(thursday_price),
                manufacturer = VALUES(manufacturer),
                mpa = VALUES(mpa),
                gan = VALUES(gan),
                weight = VALUES(weight),
                instock = VALUES(instock),
                availability = VALUES(availability),
                quantity = VALUES(quantity),
                extra_images = VALUES(extra_images)';
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $pdo->commit();
        }
        
        // Restore MySQL settings
        $pdo->query('SET foreign_key_checks = 1');
        $pdo->query('SET unique_checks = 1');
        $pdo->query('SET autocommit = 1');

        // Log import
        $logStmt = $pdo->prepare('INSERT INTO xml_import_log (products_imported, status) VALUES (?, ?)');
        $logStmt->execute([$importedCount, 'success']);

        echo json_encode(['success' => true, 'imported' => $importedCount]);
    } catch (Exception $e) {
        $logStmt = $pdo->prepare('INSERT INTO xml_import_log (status, error_message) VALUES (?, ?)');
        $logStmt->execute(['error', $e->getMessage()]);
        
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// API endpoint to get products
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_products') {
    try {
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 20);
        $search = trim($_GET['search'] ?? '');
        $category = trim($_GET['category'] ?? '');
        $random = isset($_GET['random']) && $_GET['random'] === '1';
        
        // Validate limit
        $limit = min(max($limit, 1), 100);
        
        $pagination = getPagination($page, $limit);
        
        // Check if visibility settings exist
        $countStmt = $pdo->query('SELECT COUNT(*) as count FROM category_visibility');
        $visibilityTableExists = $countStmt->fetch()['count'] > 0;
        
        // Get visibility settings for categories
        $visibilityMap = [];
        if ($visibilityTableExists) {
            $visibilityStmt = $pdo->query('SELECT cat_id, visible FROM category_visibility');
            while ($row = $visibilityStmt->fetch()) {
                $visibilityMap[(int)$row['cat_id']] = (int)$row['visible'];
            }
        }
        
        $query = 'SELECT p.* FROM products p WHERE 1=1';
        $params = [];
        
        // Filter by visible categories (if visibility settings exist)
        if (!empty($visibilityMap)) {
            // Get list of visible category IDs
            $visibleCatIds = array_keys(array_filter($visibilityMap, function($v) { return $v === 1; }));
            if (!empty($visibleCatIds)) {
                $placeholders = implode(',', array_fill(0, count($visibleCatIds), '?'));
                $query .= " AND p.cat_id IN ($placeholders)";
                $params = array_merge($params, $visibleCatIds);
            } else {
                // If visibility is set but no categories are visible, show nothing
                $query .= " AND 1=0";
            }
        }
        
        if ($search) {
            $query .= ' AND (p.name LIKE ? OR p.description LIKE ? OR p.model LIKE ? OR p.category LIKE ? OR p.manufacturer LIKE ?)';
            $searchTerm = '%' . $search . '%';
            $params = array_merge($params, array_fill(0, 5, $searchTerm));
        }
        
        if ($category) {
            // Check if category is a custom category (format: custom_ID)
            if (strpos($category, 'custom_') === 0) {
                // Extract the custom category ID
                $customCatId = (int)substr($category, 7);
                // Get the custom category name
                $catStmt = $pdo->prepare('SELECT name FROM categories WHERE id = ?');
                $catStmt->execute([$customCatId]);
                $catRow = $catStmt->fetch();
                
                if ($catRow) {
                    // Match the category name exactly for custom categories
                    $query .= ' AND TRIM(p.category) = ?';
                    $params[] = $catRow['name'];
                } else {
                    // Category not found, return empty results
                    $query .= ' AND 1=0';
                }
            } else {
                // Regular imported category
                $query .= ' AND p.cat_id = ?';
                $params[] = $category;
            }
        }
        
        // Add randomization if requested
        if ($random) {
            $query .= ' ORDER BY RAND()';
        }
        
        $query .= ' LIMIT ? OFFSET ?';
        $params[] = $pagination['limit'];
        $params[] = $pagination['offset'];
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $products = $stmt->fetchAll();
        
        // Get total count
        $countQuery = 'SELECT COUNT(*) as total FROM products p WHERE 1=1';
        $countParams = [];
        
        // Filter by visible categories (if visibility settings exist)
        if (!empty($visibleCatIds)) {
            $placeholders = implode(',', array_fill(0, count($visibleCatIds), '?'));
            $countQuery .= " AND p.cat_id IN ($placeholders)";
            $countParams = array_merge($countParams, $visibleCatIds);
        }
        
        if ($search) {
            $countQuery .= ' AND (p.name LIKE ? OR p.description LIKE ? OR p.model LIKE ? OR p.category LIKE ? OR p.manufacturer LIKE ?)';
            $countParams = array_merge($countParams, array_fill(0, 5, '%' . $search . '%'));
        }
        if ($category) {
            // Check if category is a custom category (format: custom_ID)
            if (strpos($category, 'custom_') === 0) {
                // Extract the custom category ID
                $customCatId = (int)substr($category, 7);
                // Get the custom category name
                $catStmt = $pdo->prepare('SELECT name FROM categories WHERE id = ?');
                $catStmt->execute([$customCatId]);
                $catRow = $catStmt->fetch();
                
                if ($catRow) {
                    // Match the category name exactly for custom categories
                    $countQuery .= ' AND TRIM(p.category) = ?';
                    $countParams[] = $catRow['name'];
                } else {
                    // Category not found, return empty results
                    $countQuery .= ' AND 1=0';
                }
            } else {
                // Regular imported category
                $countQuery .= ' AND p.cat_id = ?';
                $countParams[] = $category;
            }
        }
        
        $countStmt = $pdo->prepare($countQuery);
        $countStmt->execute($countParams);
        $total = $countStmt->fetch()['total'];
        
        // Apply 5 EUR markup only to XML-imported products
        foreach ($products as &$product) {
            $isXML = (isset($product['source']) && $product['source'] === 'xml') || !isset($product['source']);
            if (!empty($product['price_with_vat']) && floatval($product['price_with_vat']) > 0) {
                $product['price_with_vat'] = applyXMLMarkup($product['price_with_vat'], $isXML);
            }
            if (!empty($product['thursday_price']) && floatval($product['thursday_price']) > 0) {
                $product['thursday_price'] = applyXMLMarkup($product['thursday_price'], $isXML);
            }
        }
        
        echo json_encode([
            'products' => $products,
            'total' => $total,
            'page' => $pagination['page'],
            'limit' => $pagination['limit'],
            'pages' => ceil($total / $pagination['limit'])
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// API endpoint to get single product
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_product') {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
        echo json_encode(['error' => 'Product ID required']);
        exit;
    }
    
    $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ?');
    $stmt->execute([$id]);
    $product = $stmt->fetch();
    
    if (!$product) {
        http_response_code(404);
        echo json_encode(['error' => 'Product not found']);
        exit;
    }
    
    // Apply 5 EUR markup only to XML-imported products
    $isXML = (isset($product['source']) && $product['source'] === 'xml') || !isset($product['source']);
    if (!empty($product['price_with_vat']) && floatval($product['price_with_vat']) > 0) {
        $product['price_with_vat'] = applyXMLMarkup($product['price_with_vat'], $isXML);
    }
    if (!empty($product['thursday_price']) && floatval($product['thursday_price']) > 0) {
        $product['thursday_price'] = applyXMLMarkup($product['thursday_price'], $isXML);
    }
    
    // Decode extra images
    if ($product['extra_images']) {
        $product['extra_images'] = json_decode($product['extra_images'], true);
    }
    
        echo json_encode($product);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// API endpoint to get categories
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_categories') {
    try {
        // Check if visibility settings exist (first initialization)
        $countStmt = $pdo->query('SELECT COUNT(*) as count FROM category_visibility');
        $visibilityTableExists = $countStmt->fetch()['count'] > 0;
        
        // Get visibility settings for categories
        $visibilityMap = []; // cat_id => visible (0 or 1)
        $visibilityStmt = $pdo->query('SELECT cat_id, visible FROM category_visibility');
        while ($row = $visibilityStmt->fetch()) {
            $visibilityMap[(int)$row['cat_id']] = (int)$row['visible'];
        }
        
        // If visibility table has data, use it to filter; otherwise show all
        $useVisibilityFilter = !empty($visibilityMap);
        
        // Get all unique categories from products table (imported)
        $stmt = $pdo->query('
            SELECT DISTINCT cat_id, category
            FROM products
            WHERE category IS NOT NULL AND category != ""
            ORDER BY category
        ');
        $importedCategories = $stmt->fetchAll();
        
        // Get custom categories from categories table
        $stmt = $pdo->query('
            SELECT id, name, parent_id
            FROM categories
            ORDER BY parent_id, name
        ');
        $customCategories = $stmt->fetchAll();
        
        // Merge both sources - imported categories take precedence
        $allCategories = [];
        
        // Add imported categories (filter by visibility if set)
        foreach ($importedCategories as $cat) {
            $catIdInt = (int)$cat['cat_id'];
            
            // If visibility filter is enabled, check the map
            if ($useVisibilityFilter) {
                // Show if explicitly marked as visible=1, default to visible if not set
                if (isset($visibilityMap[$catIdInt]) && $visibilityMap[$catIdInt] !== 1) {
                    continue; // Skip only if explicitly marked as not visible
                }
            }
            
            $allCategories[] = [
                'cat_id' => $cat['cat_id'],
                'category' => $cat['category'],
                'type' => 'imported'
            ];
        }
        
        // Add custom categories (create a simple path structure)
        foreach ($customCategories as $cat) {
            $catIdInt = (int)$cat['id'];
            
            // If visibility filter is enabled, check the map
            if ($useVisibilityFilter) {
                // Show if explicitly marked as visible=1, default to visible if not set
                if (isset($visibilityMap[$catIdInt]) && $visibilityMap[$catIdInt] !== 1) {
                    continue; // Skip only if explicitly marked as not visible
                }
            }
            
            // Build the path for custom categories
            $path = $cat['name'];
            if ($cat['parent_id']) {
                // Find parent name
                $parentStmt = $pdo->prepare('SELECT name FROM categories WHERE id = ?');
                $parentStmt->execute([$cat['parent_id']]);
                $parent = $parentStmt->fetch();
                if ($parent) {
                    $path = $parent['name'] . ' » ' . $path;
                }
            }
            
            // Add custom categories under "Προϊόντα"
            $path = 'Προϊόντα » ' . $path;
            
            $allCategories[] = [
                'cat_id' => 'custom_' . $cat['id'],
                'category' => $path,
                'type' => 'custom',
                'id' => $cat['id']
            ];
        }
        
        // Deduplicate categories with same base name (last part of path)
        // Keep the "Προϊόντα" version and remove duplicates
        $deduplicatedCategories = [];
        $seenBaseNames = [];
        
        // First pass: collect all custom categories (Προϊόντα entries)
        foreach ($allCategories as $cat) {
            if ($cat['type'] === 'custom') {
                // Extract base name (last part after » separator)
                $parts = preg_split('/\s*»\s*/', $cat['category']);
                $baseName = trim(end($parts));
                $seenBaseNames[$baseName] = true;
                $deduplicatedCategories[] = $cat;
            }
        }
        
        // Second pass: add imported categories only if their base name hasn't been seen
        foreach ($allCategories as $cat) {
            if ($cat['type'] === 'imported') {
                $baseName = $cat['category'];
                if (!isset($seenBaseNames[$baseName])) {
                    $deduplicatedCategories[] = $cat;
                    $seenBaseNames[$baseName] = true;
                }
            }
        }
        
        $allCategories = $deduplicatedCategories;
        
        // Sort by category name
        usort($allCategories, function($a, $b) {
            return strcmp($a['category'], $b['category']);
        });
        
        echo json_encode($allCategories);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// API endpoint to get recommended products
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_recommended') {
    try {
        $catId = $_GET['cat_id'] ?? null;
        $productId = $_GET['product_id'] ?? null;
        $limit = (int)($_GET['limit'] ?? 5);
        
        if (!$catId) {
            echo json_encode([]);
        } else {
            $query = 'SELECT * FROM products WHERE cat_id = ?';
            $params = [$catId];
            
            if ($productId) {
                $query .= ' AND id != ?';
                $params[] = $productId;
            }
            
            $query .= ' LIMIT ?';
            $params[] = $limit;
            
            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $products = $stmt->fetchAll();
            
            // Apply 5 EUR markup only to XML-imported products
            foreach ($products as &$product) {
                $isXML = (isset($product['source']) && $product['source'] === 'xml') || !isset($product['source']);
                if (!empty($product['price_with_vat']) && floatval($product['price_with_vat']) > 0) {
                    $product['price_with_vat'] = applyXMLMarkup($product['price_with_vat'], $isXML);
                }
                if (!empty($product['thursday_price']) && floatval($product['thursday_price']) > 0) {
                    $product['thursday_price'] = applyXMLMarkup($product['thursday_price'], $isXML);
                }
            }
            
            echo json_encode($products);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Invalid request']);
?>
