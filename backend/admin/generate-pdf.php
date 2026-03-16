<?php
require_once '../config.php';

if (!isAdminLoggedIn()) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$orderId = $_GET['order_id'] ?? null;

if (!$orderId) {
    http_response_code(400);
    echo json_encode(['error' => 'Order ID required']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();

    if (!$order) {
        http_response_code(404);
        echo json_encode(['error' => 'Order not found']);
        exit;
    }

    // Parse items JSON
    $items = [];
    if ($order['items']) {
        $items = json_decode($order['items'], true);
    }

    // Get shipping and payment methods
    $shippingMethod = null;
    $paymentMethod = null;

    if ($order['shipping_method_id']) {
        $stmt = $pdo->prepare('SELECT * FROM shipping_methods WHERE id = ?');
        $stmt->execute([$order['shipping_method_id']]);
        $shippingMethod = $stmt->fetch();
    }

    if ($order['payment_method_id']) {
        $stmt = $pdo->prepare('SELECT * FROM payment_methods WHERE id = ?');
        $stmt->execute([$order['payment_method_id']]);
        $paymentMethod = $stmt->fetch();
    }

    // Generate HTML content for PDF
    $html = generatePdfHtml($order, $items, $shippingMethod, $paymentMethod);

    // Output as HTML with print styling (user can print to PDF from browser)
    header('Content-Type: text/html; charset=utf-8');
    header('Content-Disposition: inline; filename="Order_' . $order['order_code'] . '.html"');
    
    echo $html;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}

function generatePdfHtml($order, $items, $shippingMethod, $paymentMethod) {
    $statusText = [
        'pending' => 'Εκκρεμής',
        'sent' => 'Στάλθηκε',
        'not_sent' => 'Δεν Στάλθηκε',
        'cancelled' => 'Ακυρώθηκε',
        'returned' => 'Επιστράφηκε'
    ];

    $statusLabel = $statusText[$order['status']] ?? $order['status'];
    $orderDate = new DateTime($order['created_at']);
    $formattedDate = $orderDate->format('d/m/Y');

    $itemsHtml = '';
    $subtotal = 0;
    
    if (is_array($items) && count($items) > 0) {
        foreach ($items as $item) {
            $itemTotal = isset($item['price']) && isset($item['quantity']) ? $item['price'] * $item['quantity'] : 0;
            $subtotal += $itemTotal;
            $itemsHtml .= sprintf(
                '<tr><td>%s</td><td style="text-align: center;">%d</td><td style="text-align: right;">%.2f€</td><td style="text-align: right;">%.2f€</td></tr>',
                htmlspecialchars($item['name'] ?? ''),
                $item['quantity'] ?? 1,
                $item['price'] ?? 0,
                $itemTotal
            );
        }
    }

    // Calculate costs
    $shippingCost = ($shippingMethod && isset($shippingMethod['cost'])) ? floatval($shippingMethod['cost']) : 0;
    $paymentCost = ($paymentMethod && isset($paymentMethod['cost'])) ? floatval($paymentMethod['cost']) : 0;
    $total = floatval($order['total_amount']);
    
    // Format prices for display
    $subtotalFormatted = number_format($subtotal, 2);
    $shippingCostFormatted = number_format($shippingCost, 2);
    $paymentCostFormatted = number_format($paymentCost, 2);
    $totalFormatted = number_format($total, 2);
    
    // Build shipping and payment HTML outside heredoc
    $shippingHtml = '';
    if ($shippingMethod) {
        $shippingHtml = '<div class="summary-line"><span>Μεταφορικά (' . htmlspecialchars($shippingMethod['name'] ?? '') . '):</span><span>' . $shippingCostFormatted . '€</span></div>';
    }
    
    $paymentHtml = '';
    if ($paymentMethod) {
        $paymentHtml = '<div class="summary-line"><span>Τρόπος Πληρωμής (' . htmlspecialchars($paymentMethod['name'] ?? '') . '):</span><span>' . $paymentCostFormatted . '€</span></div>';
    }
    
    // Build tracking HTML outside heredoc
    $trackingHtml = '';
    if ($order['tracking_code']) {
        $trackingHtml = '<div class="tracking-info"><strong>Κωδικός Αποστολής:</strong> ' . htmlspecialchars($order['tracking_code']) . '</div>';
    }
    
    // Build notes HTML outside heredoc
    $notesHtml = '';
    if ($order['notes']) {
        $notesHtml = '<div class="notes-section"><strong>Σημειώσεις:</strong><br>' . htmlspecialchars($order['notes']) . '</div>';
    }

    $html = <<<HTML
<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <title>Παραγγελία {$order['order_code']}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            line-height: 1.6;
            padding: 20px;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 30px;
        }
        
        .header {
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 28px;
            color: #007bff;
            margin-bottom: 10px;
        }
        
        .header p {
            color: #666;
            font-size: 14px;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #333;
            border-left: 4px solid #007bff;
            padding-left: 12px;
            margin-bottom: 15px;
            text-transform: uppercase;
        }
        
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .detail-item {
            display: flex;
            flex-direction: column;
        }
        
        .detail-label {
            font-weight: bold;
            color: #666;
            font-size: 13px;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        
        .detail-value {
            color: #333;
            font-size: 15px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        table thead {
            background-color: #f8f9fa;
        }
        
        table th {
            padding: 12px;
            text-align: left;
            font-weight: bold;
            color: #333;
            border-bottom: 2px solid #007bff;
            font-size: 14px;
        }
        
        table td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
        }
        
        table tbody tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        
        .summary {
            float: right;
            width: 300px;
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin-left: 20px;
        }
        
        .summary-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 14px;
        }
        
        .summary-line.total {
            font-size: 18px;
            font-weight: bold;
            color: #007bff;
            border-top: 2px solid #007bff;
            padding-top: 10px;
            margin-top: 10px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 13px;
            text-transform: uppercase;
        }
        
        .status-pending {
            background-color: #ffc107;
            color: #333;
        }
        
        .status-sent {
            background-color: #28a745;
            color: white;
        }
        
        .status-not_sent {
            background-color: #dc3545;
            color: white;
        }
        
        .status-cancelled {
            background-color: #6c757d;
            color: white;
        }
        
        .status-returned {
            background-color: #17a2b8;
            color: white;
        }
        
        .tracking-info {
            background-color: #d4edda;
            padding: 15px;
            border-left: 4px solid #28a745;
            margin-bottom: 20px;
        }
        
        .notes-section {
            background-color: #fff3cd;
            padding: 15px;
            border-left: 4px solid #ffc107;
            margin-bottom: 20px;
        }
        
        .footer {
            border-top: 2px solid #ddd;
            padding-top: 20px;
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        
        .clear-both {
            clear: both;
        }
        
        @media print {
            body {
                padding: 0;
            }
            .container {
                box-shadow: none;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Λεπτομέρειες Παραγγελίας</h1>
            <p>Παραγγελία #{$order['order_code']}</p>
        </div>
        
        <div class="section">
            <div class="section-title">Πληροφορίες Παραγγελίας</div>
            <div class="details-grid">
                <div class="detail-item">
                    <span class="detail-label">Κωδικός Παραγγελίας</span>
                    <span class="detail-value">{$order['order_code']}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Ημερομηνία</span>
                    <span class="detail-value">{$formattedDate}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Κατάσταση</span>
                    <span class="detail-value"><span class="status-badge status-{$order['status']}">{$statusLabel}</span></span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Σύνολο</span>
                    <span class="detail-value" style="font-size: 18px; font-weight: bold; color: #007bff;">{$order['total_amount']}€</span>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Πληροφορίες Πελάτη</div>
            <div class="details-grid">
                <div class="detail-item">
                    <span class="detail-label">Όνομα Πελάτη</span>
                    <span class="detail-value">{$order['customer_name']}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Email</span>
                    <span class="detail-value">{$order['customer_email']}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Τηλέφωνο</span>
                    <span class="detail-value">{$order['customer_phone']}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Διεύθυνση</span>
                    <span class="detail-value">{$order['customer_address']}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Πόλη</span>
                    <span class="detail-value">{$order['customer_city']}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Νομός</span>
                    <span class="detail-value">{$order['customer_state']}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">ΤΚ</span>
                    <span class="detail-value">{$order['customer_postal_code']}</span>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Προϊόντα</div>
            <table>
                <thead>
                    <tr>
                        <th>Προϊόν</th>
                        <th style="text-align: center; width: 80px;">Ποσότητα</th>
                        <th style="text-align: right; width: 100px;">Τιμή</th>
                        <th style="text-align: right; width: 100px;">Σύνολο</th>
                    </tr>
                </thead>
                <tbody>
                    {$itemsHtml}
                </tbody>
            </table>
            
            <div class="summary">
                <div class="summary-line">
                    <span>Υπό-σύνολο:</span>
                    <span>{$subtotalFormatted}€</span>
                </div>
                {$shippingHtml}
                {$paymentHtml}
                <div class="summary-line total">
                    <span>ΣΥΝΟΛΟ:</span>
                    <span>{$totalFormatted}€</span>
                </div>
            </div>
            <div class="clear-both"></div>
        </div>
        
        {$trackingHtml}
        
        {$notesHtml}
        
        <div class="footer">
            <p>Αυτό το έγγραφο εκδόθηκε αυτόματα από το σύστημα</p>
            <p>Ημερομηνία Εκτύπωσης: {$formattedDate}</p>
        </div>
    </div>
</body>
</html>
HTML;

    return $html;
}
?>
