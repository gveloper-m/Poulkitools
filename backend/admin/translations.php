<?php
require_once '../config.php';

header('Content-Type: application/json');

// Auto-migrate: Create translations table if it doesn't exist
try {
    $pdo->exec('CREATE TABLE IF NOT EXISTS translations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        greek_text VARCHAR(500) UNIQUE NOT NULL,
        english_text VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
} catch (PDOException $e) {
    // Table likely exists already
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'get_all') {
        try {
            $stmt = $pdo->prepare('SELECT id, greek_text, english_text FROM translations ORDER BY greek_text ASC');
            $stmt->execute();
            $translations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'translations' => $translations
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }
    
    if ($action === 'get_by_language') {
        $language = $_GET['language'] ?? 'el';
        
        try {
            if ($language === 'en') {
                $stmt = $pdo->prepare('SELECT greek_text, english_text FROM translations WHERE english_text IS NOT NULL AND english_text != ""');
            } else {
                $stmt = $pdo->prepare('SELECT greek_text FROM translations');
            }
            
            $stmt->execute();
            $translations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $result = [];
            foreach ($translations as $trans) {
                if ($language === 'en' && !empty($trans['english_text'])) {
                    $result[$trans['greek_text']] = $trans['english_text'];
                } else {
                    $result[$trans['greek_text']] = $trans['greek_text'];
                }
            }
            
            echo json_encode([
                'success' => true,
                'translations' => $result
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }
    
    // Export untranslated entries to JSON
    if ($action === 'export_untranslated') {
        try {
            $stmt = $pdo->prepare('SELECT greek_text, english_text FROM translations WHERE english_text IS NULL OR english_text = "" ORDER BY greek_text ASC');
            $stmt->execute();
            $untranslated = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $export = [];
            foreach ($untranslated as $trans) {
                $export[$trans['greek_text']] = '';
            }
            
            header('Content-Type: application/json');
            header('Content-Disposition: attachment; filename="translations_empty_' . date('Y-m-d_His') . '.json"');
            echo json_encode($export, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }
    
    // Export all translations to JSON
    if ($action === 'export_all') {
        try {
            $stmt = $pdo->prepare('SELECT greek_text, english_text FROM translations ORDER BY greek_text ASC');
            $stmt->execute();
            $all = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $export = [];
            foreach ($all as $trans) {
                $export[$trans['greek_text']] = $trans['english_text'] ?? '';
            }
            
            header('Content-Type: application/json');
            header('Content-Disposition: attachment; filename="translations_all_' . date('Y-m-d_His') . '.json"');
            echo json_encode($export, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'save_translations') {
        if (!isAdminLoggedIn()) {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        
        $translations = $_POST['translations'] ?? '{}';
        $translations = json_decode($translations, true);
        
        if (empty($translations)) {
            http_response_code(400);
            echo json_encode(['error' => 'No translations provided']);
            exit;
        }
        
        try {
            $stmt = $pdo->prepare('
                INSERT INTO translations (greek_text, english_text) 
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE english_text = VALUES(english_text), updated_at = CURRENT_TIMESTAMP
            ');
            
            $saved = 0;
            foreach ($translations as $greek => $english) {
                $stmt->execute([$greek, $english]);
                $saved++;
            }
            
            echo json_encode([
                'success' => true,
                'message' => "Saved $saved translations"
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }
    
    // Import translations from uploaded JSON file
    if ($action === 'import_json') {
        if (!isAdminLoggedIn()) {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        
        if (!isset($_FILES['file'])) {
            http_response_code(400);
            echo json_encode(['error' => 'No file uploaded']);
            exit;
        }
        
        try {
            $fileContent = file_get_contents($_FILES['file']['tmp_name']);
            $translations = json_decode($fileContent, true);
            
            if (!is_array($translations)) {
                throw new Exception('Invalid JSON format');
            }
            
            $stmt = $pdo->prepare('
                INSERT INTO translations (greek_text, english_text) 
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE english_text = VALUES(english_text), updated_at = CURRENT_TIMESTAMP
            ');
            
            $imported = 0;
            foreach ($translations as $greek => $english) {
                if (!empty($greek)) {
                    $stmt->execute([$greek, $english ?? null]);
                    $imported++;
                }
            }
            
            echo json_encode([
                'success' => true,
                'message' => "Imported $imported translations",
                'count' => $imported
            ]);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        }
        exit;
    }
    
    if ($action === 'add_missing') {
        if (!isAdminLoggedIn()) {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        
        $texts = $_POST['texts'] ?? '[]';
        $texts = json_decode($texts, true);
        
        if (empty($texts)) {
            http_response_code(400);
            echo json_encode(['error' => 'No texts provided']);
            exit;
        }
        
        try {
            $stmt = $pdo->prepare('
                INSERT IGNORE INTO translations (greek_text, english_text) 
                VALUES (?, NULL)
            ');
            
            $added = 0;
            foreach ($texts as $text) {
                if (!empty($text)) {
                    $stmt->execute([$text]);
                    if ($pdo->lastInsertId() > 0) {
                        $added++;
                    }
                }
            }
            
            echo json_encode([
                'success' => true,
                'message' => "Added $added new translation entries"
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }
    
    // Import translations from JSON file
    if ($action === 'import_json') {
        if (!isAdminLoggedIn()) {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['error' => 'No file uploaded or file error']);
            exit;
        }
        
        $file = $_FILES['file'];
        
        // Validate file type
        if ($file['type'] !== 'application/json') {
            http_response_code(400);
            echo json_encode(['error' => 'Only JSON files are allowed']);
            exit;
        }
        
        try {
            $fileContent = file_get_contents($file['tmp_name']);
            $translations = json_decode($fileContent, true);
            
            if (!is_array($translations)) {
                throw new Exception('Invalid JSON format');
            }
            
            $stmt = $pdo->prepare('
                INSERT INTO translations (greek_text, english_text) 
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE english_text = VALUES(english_text), updated_at = CURRENT_TIMESTAMP
            ');
            
            $saved = 0;
            foreach ($translations as $greek => $english) {
                if (!empty($greek)) {
                    $stmt->execute([$greek, $english]);
                    $saved++;
                }
            }
            
            echo json_encode([
                'success' => true,
                'message' => "Εισήχθησαν $saved μεταφράσεις"
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error: ' . $e->getMessage()]);
        }
        exit;
    }
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
?>
