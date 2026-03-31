<?php
// Configuration file for database and application settings

// Database connection details
define('DB_HOST', 'localhost:3306');
define('DB_USER', 'poulkitoolsadmin');
define('DB_PASS', '9^sL%fy0dDlCdor8');
define('DB_NAME', 'x200406gma_');

// Session configuration
session_start();
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Database connection
try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';port=3306;dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Helper function to get settings
function getSettings() {
    global $pdo;
    $stmt = $pdo->query('SELECT * FROM settings WHERE id = 1');
    return $stmt->fetch() ?: [];
}

// Helper function to add XML import markup (5 EUR)
function applyXMLMarkup($price, $isXML = true) {
    // Only add 5 EUR markup to XML-imported products
    if ($isXML) {
        return floatval($price) + 5.00;
    }
    return floatval($price);
}

// Helper function to check admin login
function isAdminLoggedIn() {
    return isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
}

// Helper function to generate unique order code
function generateOrderCode() {
    return 'ORD-' . strtoupper(bin2hex(random_bytes(4))) . '-' . date('Ymd');
}

// Helper function for pagination
function getPagination($page, $limit) {
    $page = max(1, (int)$page);
    $offset = ($page - 1) * $limit;
    return ['offset' => $offset, 'limit' => $limit, 'page' => $page];
}

// Translations
$translations = [
    'el' => [
        'home' => 'Αρχική',
        'about' => 'Σχετικά με εμάς',
        'cart' => 'Καλάθι',
        'checkout' => 'Ολοκλήρωση Αγοράς',
        'my_orders' => 'Οι Παραγγελίες Μου',
        'products' => 'Προϊόντα',
        'search' => 'Αναζήτηση',
        'add_to_cart' => 'Προσθήκη στο Καλάθι',
        'quantity' => 'Ποσότητα',
        'price' => 'Τιμή',
        'availability' => 'Διαθεσιμότητα',
        'product_details' => 'Λεπτομέρειες Προϊόντος',
        'recommended' => 'Προτεινόμενα Προϊόντα',
        'shipping_method' => 'Τρόπος Αποστολής',
        'payment_method' => 'Τρόπος Πληρωμής',
        'customer_name' => 'Όνομα Πελάτη',
        'customer_email' => 'Email',
        'customer_phone' => 'Τηλέφωνο',
        'customer_address' => 'Διεύθυνση',
        'order_summary' => 'Περίληψη Παραγγελίας',
        'total' => 'Σύνολο',
        'place_order' => 'Ολοκλήρωση Παραγγελίας',
        'view_orders' => 'Δείτε τις Παραγγελίες Σας',
        'order_code' => 'Κωδικός Παραγγελίας',
        'tracking_code' => 'Κωδικός Αποστολής',
        'status' => 'Κατάσταση',
        'notes' => 'Σημειώσεις',
        'accessibility_mode' => 'Λειτουργία Προσβασιμότητας',
        'language' => 'Γλώσσα',
        'contact' => 'Επικοινωνία',
        'footer_info' => 'Πληροφορίες',
        'all_rights_reserved' => 'Όλα τα δικαιώματα διατηρούνται',
        'cart_empty' => 'Το καλάθι σας είναι κενό',
        'remove' => 'Αφαίρεση',
        'update_cart' => 'Ενημέρωση Καλαθιού',
        'continue_shopping' => 'Συνέχεια Αγορών',
        'empty' => 'Κενό',
        'loading' => 'Φόρτωση...',
        'error' => 'Σφάλμα',
        'success' => 'Επιτυχία',
        'sent' => 'Στάλθηκε',
        'not_sent' => 'Δεν Στάλθηκε',
        'cancelled' => 'Ακυρώθηκε',
        'returned' => 'Επιστράφηκε',
        'pending' => 'Εκκρεμής',
    ],
    'en' => [
        'home' => 'Home',
        'about' => 'About Us',
        'cart' => 'Cart',
        'checkout' => 'Checkout',
        'my_orders' => 'My Orders',
        'products' => 'Products',
        'search' => 'Search',
        'add_to_cart' => 'Add to Cart',
        'quantity' => 'Quantity',
        'price' => 'Price',
        'availability' => 'Availability',
        'product_details' => 'Product Details',
        'recommended' => 'Recommended Products',
        'shipping_method' => 'Shipping Method',
        'payment_method' => 'Payment Method',
        'customer_name' => 'Customer Name',
        'customer_email' => 'Email',
        'customer_phone' => 'Phone',
        'customer_address' => 'Address',
        'order_summary' => 'Order Summary',
        'total' => 'Total',
        'place_order' => 'Place Order',
        'view_orders' => 'View Your Orders',
        'order_code' => 'Order Code',
        'tracking_code' => 'Tracking Code',
        'status' => 'Status',
        'notes' => 'Notes',
        'accessibility_mode' => 'Accessibility Mode',
        'language' => 'Language',
        'contact' => 'Contact',
        'footer_info' => 'Information',
        'all_rights_reserved' => 'All rights reserved',
        'cart_empty' => 'Your cart is empty',
        'remove' => 'Remove',
        'update_cart' => 'Update Cart',
        'continue_shopping' => 'Continue Shopping',
        'empty' => 'Empty',
        'loading' => 'Loading...',
        'error' => 'Error',
        'success' => 'Success',
        'sent' => 'Sent',
        'not_sent' => 'Not Sent',
        'cancelled' => 'Cancelled',
        'returned' => 'Returned',
        'pending' => 'Pending',
    ]
];

function translate($key, $lang = 'el') {
    global $translations;
    return $translations[$lang][$key] ?? $key;
}

// Auto-run migrations
function runMigrations() {
    global $pdo;
    
    $migrations = [
        'add_categories_table.sql',
        'add_payment_cost.sql',
        'add_search_image.sql',
        'add_featured_products.sql'
    ];
    
    $migrationPath = __DIR__ . '/../migrations/';
    
    foreach ($migrations as $migration) {
        $filePath = $migrationPath . $migration;
        if (file_exists($filePath)) {
            try {
                $sql = file_get_contents($filePath);
                // Execute multiple statements
                $pdo->exec($sql);
            } catch (PDOException $e) {
                // Migration already applied or error - continue
                error_log('Migration notice: ' . $migration . ' - ' . $e->getMessage());
            }
        }
    }
}

// Run migrations on config load
runMigrations();
?>
