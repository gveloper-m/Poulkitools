<?php
require_once '../config.php';

header('Content-Type: application/json');

// Auto-migrate: Create branding table if it doesn't exist
try {
    $pdo->exec('CREATE TABLE IF NOT EXISTS branding (
        id INT PRIMARY KEY AUTO_INCREMENT,
        site_name VARCHAR(255),
        logo_path VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    
    // Ensure there's at least one row
    $stmt = $pdo->query('SELECT COUNT(*) as count FROM branding');
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($result['count'] == 0) {
        $pdo->exec("INSERT INTO branding (site_name) VALUES ('Poulki Shop')");
    }
} catch (PDOException $e) {
    // Table likely exists
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'get_branding') {
        try {
            $stmt = $pdo->query('SELECT site_name, logo_path FROM branding LIMIT 1');
            $branding = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$branding) {
                $branding = ['site_name' => 'Poulki Shop', 'logo_path' => null];
            }
            
            echo json_encode([
                'success' => true,
                'branding' => $branding
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'save_logo') {
        if (!isAdminLoggedIn()) {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        
        $siteName = $_POST['site_name'] ?? 'Poulki Shop';
        $logoPath = $_POST['logo_path'] ?? null;
        
        try {
            // Update the first (and only) branding row
            $stmt = $pdo->prepare('UPDATE branding SET site_name = ?, logo_path = ?, updated_at = CURRENT_TIMESTAMP LIMIT 1');
            $stmt->execute([$siteName, $logoPath]);
            
            // If no rows were updated, insert one
            if ($stmt->rowCount() == 0) {
                $insertStmt = $pdo->prepare('INSERT INTO branding (site_name, logo_path) VALUES (?, ?)');
                $insertStmt->execute([$siteName, $logoPath]);
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Branding saved successfully',
                'branding' => [
                    'site_name' => $siteName,
                    'logo_path' => $logoPath
                ]
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }
    
    if ($action === 'upload_logo') {
        if (!isAdminLoggedIn()) {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        
        if (!isset($_FILES['logo'])) {
            http_response_code(400);
            echo json_encode(['error' => 'No file uploaded']);
            exit;
        }
        
        $file = $_FILES['logo'];
        $uploadDir = '../../uploads/logos/';
        
        // Create directory if it doesn't exist
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Validate file type
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!in_array($file['type'], $allowedTypes)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid file type. Only images are allowed.']);
            exit;
        }
        
        // Validate file size (max 5MB)
        if ($file['size'] > 5 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(['error' => 'File too large. Max 5MB.']);
            exit;
        }
        
        // Generate unique filename
        $filename = 'logo_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . pathinfo($file['name'], PATHINFO_EXTENSION);
        $filepath = $uploadDir . $filename;
        
        if (!move_uploaded_file($file['tmp_name'], $filepath)) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to upload file']);
            exit;
        }
        
        // Return path relative to web root
        $logoPath = 'uploads/logos/' . $filename;
        
        try {
            $siteName = $_POST['site_name'] ?? 'Poulki Shop';
            
            // Update the first branding row
            $stmt = $pdo->prepare('UPDATE branding SET site_name = ?, logo_path = ?, updated_at = CURRENT_TIMESTAMP LIMIT 1');
            $stmt->execute([$siteName, $logoPath]);
            
            // If no rows were updated, insert one
            if ($stmt->rowCount() == 0) {
                $insertStmt = $pdo->prepare('INSERT INTO branding (site_name, logo_path) VALUES (?, ?)');
                $insertStmt->execute([$siteName, $logoPath]);
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Logo uploaded successfully',
                'logo_path' => $logoPath,
                'branding' => [
                    'site_name' => $siteName,
                    'logo_path' => $logoPath
                ]
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }
    
    if ($action === 'remove_logo') {
        if (!isAdminLoggedIn()) {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        
        try {
            // Get current logo path
            $stmt = $pdo->query('SELECT logo_path FROM branding LIMIT 1');
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result && $result['logo_path']) {
                $logoFile = '../../' . $result['logo_path'];
                if (file_exists($logoFile)) {
                    unlink($logoFile);
                }
            }
            
            // Clear logo path
            $stmt = $pdo->prepare('UPDATE branding SET logo_path = NULL, updated_at = CURRENT_TIMESTAMP');
            $stmt->execute();
            
            echo json_encode([
                'success' => true,
                'message' => 'Logo removed successfully'
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }
}

http_response_code(400);
echo json_encode(['error' => 'Invalid request']);
