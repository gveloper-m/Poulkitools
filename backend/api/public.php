<?php
require_once '../config.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'get_banners') {
        try {
            $stmt = $pdo->query('SELECT * FROM banners ORDER BY position');
            $banners = $stmt->fetchAll() ?: [];
            echo json_encode($banners ?: []);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error']);
        }
        exit;
    }
    
    if ($action === 'get_search_image') {
        try {
            $settings = getSettings();
            echo json_encode([
                'success' => true,
                'search_image' => !empty($settings['search_image']) ? $settings['search_image'] : null
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database error']);
        }
        exit;
    }
    
    if ($action === 'get_settings') {
        try {
            $settings = getSettings();
            $settings['social_instagram'] = 'https://www.instagram.com/poulki_tools/';
            $settings['social_facebook'] = 'https://www.facebook.com/people/Poulki-Tools/100092409976755/?locale=is_IS#';
            $settings['social_twitter'] = 'https://www.tiktok.com/@poulki_tools';
            echo json_encode($settings ?: []);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error']);
        }
        exit;
    }
}

http_response_code(400);
echo json_encode(['error' => 'Invalid request']);
?>
