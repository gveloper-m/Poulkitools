<?php
require_once '../config.php';

header('Content-Type: application/json');

if (!isAdminLoggedIn()) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'update_settings') {
        $siteName = $_POST['site_name'] ?? '';
        $contactEmail = $_POST['contact_email'] ?? '';
        $contactPhone = $_POST['contact_phone'] ?? '';
        $footerText = $_POST['footer_text'] ?? '';
        $socialFacebook = $_POST['social_facebook'] ?? '';
        $socialInstagram = $_POST['social_instagram'] ?? '';
        $socialTwitter = $_POST['social_twitter'] ?? '';
        $socialYoutube = $_POST['social_youtube'] ?? '';
        $mapsIframeUrl = $_POST['maps_iframe_url'] ?? '';
        $aboutUsText = $_POST['about_us_text'] ?? '';
        $homeTitle = $_POST['home_title'] ?? '';
        $homeDescription = $_POST['home_description'] ?? '';

        $stmt = $pdo->prepare('
            UPDATE settings SET
            site_name = ?, contact_email = ?, contact_phone = ?, footer_text = ?,
            social_facebook = ?, social_instagram = ?, social_twitter = ?, social_youtube = ?,
            maps_iframe_url = ?, about_us_text = ?, home_title = ?, home_description = ?
            WHERE id = 1
        ');

        $stmt->execute([
            $siteName, $contactEmail, $contactPhone, $footerText,
            $socialFacebook, $socialInstagram, $socialTwitter, $socialYoutube,
            $mapsIframeUrl, $aboutUsText, $homeTitle, $homeDescription
        ]);

        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'change_password') {
        $currentPassword = $_POST['current_password'] ?? '';
        $newPassword = $_POST['new_password'] ?? '';

        $settings = getSettings();
        if (!password_verify($currentPassword, $settings['admin_password'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Current password is incorrect']);
            exit;
        }

        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare('UPDATE settings SET admin_password = ? WHERE id = 1');
        $stmt->execute([$hashedPassword]);

        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'change_username') {
        $newUsername = $_POST['new_username'] ?? '';
        if (!$newUsername) {
            http_response_code(400);
            echo json_encode(['error' => 'Username required']);
            exit;
        }

        $stmt = $pdo->prepare('UPDATE settings SET admin_username = ? WHERE id = 1');
        $stmt->execute([$newUsername]);

        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'get_settings') {
        $settings = getSettings();
        echo json_encode($settings);
        exit;
    }

    if ($action === 'save_featured_products') {
        try {
            $productIds = $_POST['product_ids'] ?? '[]';
            $productIds = json_decode($productIds, true);
            
            if (!is_array($productIds)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid product IDs']);
                exit;
            }

            // Delete existing featured products
            $pdo->query('DELETE FROM featured_products');
            
            // Insert new featured products
            if (!empty($productIds)) {
                $stmt = $pdo->prepare('INSERT INTO featured_products (product_id, position) VALUES (?, ?)');
                foreach ($productIds as $position => $productId) {
                    $stmt->execute([(int)$productId, (int)$position]);
                }
            }

            echo json_encode(['success' => true]);
            exit;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
            exit;
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';

    if ($action === 'get_featured_products') {
        try {
            $stmt = $pdo->query('
                SELECT fp.id, fp.product_id, fp.position, p.name, p.image, p.price_with_vat
                FROM featured_products fp
                JOIN products p ON fp.product_id = p.id
                ORDER BY fp.position
            ');
            $products = $stmt->fetchAll() ?: [];
            echo json_encode($products);
            exit;
        } catch (Exception $e) {
            // Table doesn't exist yet, return empty array
            header('Content-Type: application/json');
            echo json_encode([]);
            exit;
        }
    }
}

http_response_code(400);
echo json_encode(['error' => 'Invalid request']);
?>
