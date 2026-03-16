// Common JavaScript functionality across all pages

// Detect if we're on Plesk preview path and build the correct base path
function getBasePath() {
    const currentPath = window.location.pathname;
    
    // Check if we're on Plesk preview URL
    // Format: /plesk-site-preview/domain/protocol/ip-or-domain/
    if (currentPath.includes('/plesk-site-preview/')) {
        const match = currentPath.match(/^(\/plesk-site-preview\/[^\/]+\/[^\/]+\/[^\/]+\/)/);
        if (match) {
            return match[1];
        }
    }
    
    // Default: no base path for direct domain access
    return '';
}

const basePath = getBasePath();
const API_BASE = window.location.origin + basePath + '/backend/api';
const ADMIN_BASE = window.location.origin + basePath + '/backend/admin';
let currentLanguage = localStorage.getItem('language') || 'el';
let isAccessibilityMode = localStorage.getItem('accessibilityMode') === 'true';

// Helper function to construct API URLs dynamically
function getApiUrl(path) {
    return API_BASE + path;
}

function getAdminUrl(path) {
    return ADMIN_BASE + path;
}

// Safe JSON parsing helper function
async function safeJsonFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        if (!text) {
            console.warn(`Empty response from ${url}`);
            return null;
        }
        
        return JSON.parse(text);
    } catch (error) {
        console.error(`Error fetching/parsing JSON from ${url}:`, error);
        return null;
    }
}

// Helper function to fix image paths from API responses
function fixImagePath(imagePath) {
    if (!imagePath) return '';
    
    // If path is already absolute or full URL, return as-is
    if (imagePath.startsWith('http')) {
        return imagePath;
    }
    
    // For relative paths or paths starting with /, apply the base path
    if (!imagePath.startsWith('/')) {
        imagePath = '/' + imagePath;
    }
    
    // Add the Plesk base path if we're on a preview URL
    return basePath + imagePath;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Apply cached branding immediately
    const cached = localStorage.getItem('branding_cache');
    if (cached) {
        try {
            const branding = JSON.parse(cached);
            applyBranding(branding);
        } catch (e) {}
    }
    
    await initializeApp();
});

async function initializeApp() {
    // Set accessibility mode
    applyAccessibilityMode();

    // Set language
    setLanguage(currentLanguage);

    // Load branding, settings, and categories in parallel (don't wait for all)
    Promise.all([
        loadBranding(),
        loadSettings(),
        loadCategories()
    ]).catch(err => console.error('Error during parallel initialization:', err));

    // Setup UI elements immediately
    updateCartCount();

    // Setup accessibility toggle
    const accessibilityToggle = document.getElementById('accessibilityToggle');
    if (accessibilityToggle) {
        accessibilityToggle.addEventListener('click', toggleAccessibilityMode);
    }

    // Setup language toggle
    const languageToggle = document.getElementById('languageToggle');
    if (languageToggle) {
        languageToggle.value = currentLanguage;
        languageToggle.addEventListener('change', (e) => {
            currentLanguage = e.target.value;
            localStorage.setItem('language', currentLanguage);
            loadAndApplyTranslations(currentLanguage);
        });
    }

    // Setup search form
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput.value.trim()) {
                const params = new URLSearchParams({
                    q: searchInput.value.trim()
                });
                
                // Check if already on search page
                const isOnSearchPage = window.location.pathname.includes('search.html');
                
                if (isOnSearchPage) {
                    // Already on search page, just update the query parameter
                    window.location.href = `?${params}`;
                } else if (window.location.pathname.includes('/pages/')) {
                    // On another page in /pages/ folder, go back to search.html
                    window.location.href = `search.html?${params}`;
                } else {
                    // On root index, go to search.html in pages folder
                    window.location.href = `pages/search.html?${params}`;
                }
            }
        });
    }

    // Setup scroll to top car
    setupScrollToTopCar();

    // Setup products dropdown
    setupProductsDropdown();
}

function applyAccessibilityMode() {
    if (isAccessibilityMode) {
        document.body.classList.add('accessibility-mode');
    } else {
        document.body.classList.remove('accessibility-mode');
    }
}

function toggleAccessibilityMode() {
    isAccessibilityMode = !isAccessibilityMode;
    localStorage.setItem('accessibilityMode', isAccessibilityMode);
    applyAccessibilityMode();
    showNotification(isAccessibilityMode ? 'Λειτουργία προσβασιμότητας ενεργοποιήθηκε' : 'Λειτουργία προσβασιμότητας απενεργοποιήθηκε');
}

async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/public.php?action=get_settings`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        if (!text) {
            console.error('Empty response from settings API');
            return;
        }

        const settings = JSON.parse(text);

        if (!settings.error) {
            // Update footer
            const footerText = document.getElementById('footerText');
            if (footerText) footerText.textContent = settings.site_name || 'Poulki Shop';

            const contactEmail = document.getElementById('contactEmail');
            if (contactEmail) contactEmail.innerHTML = `Email: ${settings.contact_email || 'poulki.tools@gmail.com'}`;

            const contactPhone = document.getElementById('contactPhone');
            if (contactPhone) contactPhone.innerHTML = `Τηλέφωνο: ${settings.contact_phone || '+30 2461 023700'}`;

            const copyrightText = document.getElementById('copyrightText');
            if (copyrightText) copyrightText.textContent = `${settings.site_name || 'Poulki Shop'} 2026 - ${translate('all_rights_reserved', currentLanguage)}`;

            // Update social networks section (only show if at least one social URL exists)
            const socialNetworksSection = document.getElementById('socialNetworksSection');
            const socialNetworksList = document.getElementById('socialNetworksList');
            
            if (socialNetworksSection && socialNetworksList) {
                const socialLinks = [];
                
                // Helper function to ensure URLs have a protocol
                const ensureProtocol = (url) => {
                    if (!url) return '';
                    if (!/^https?:\/\//.test(url)) {
                        return 'https://' + url;
                    }
                    return url;
                };
                
                if (settings.social_facebook) {
                    socialLinks.push(`<li><a href="${ensureProtocol(settings.social_facebook)}" target="_blank" rel="noopener noreferrer">Facebook</a></li>`);
                }
                if (settings.social_instagram) {
                    socialLinks.push(`<li><a href="${ensureProtocol(settings.social_instagram)}" target="_blank" rel="noopener noreferrer">Instagram</a></li>`);
                }
                if (settings.social_twitter) {
                    socialLinks.push(`<li><a href="${ensureProtocol(settings.social_twitter)}" target="_blank" rel="noopener noreferrer">TikTok</a></li>`);
                }
                if (settings.social_youtube) {
                    socialLinks.push(`<li><a href="${ensureProtocol(settings.social_youtube)}" target="_blank" rel="noopener noreferrer">YouTube</a></li>`);
                }
                
                // Only show social networks section if at least one link exists
                if (socialLinks.length > 0) {
                    socialNetworksList.innerHTML = socialLinks.join('');
                    socialNetworksSection.style.display = 'block';
                } else {
                    socialNetworksSection.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/products.php?action=get_categories`);
        const categories = await response.json();

        console.log('Categories loaded in loadCategories:', categories);

        const categoriesMenu = document.getElementById('categoriesMenu');
        if (categoriesMenu && categories.length > 0) {
            categoriesMenu.innerHTML = categories.map(cat =>
                `<a href="pages/category.html?id=${encodeURIComponent(cat.cat_id)}" class="dropdown-item">${cat.category}</a>`
            ).join('');

            // Add click handler to products dropdown
            const productsDropdown = document.getElementById('productsDropdown');
            if (productsDropdown) {
                productsDropdown.addEventListener('click', (e) => {
                    e.preventDefault();
                    categoriesMenu.classList.toggle('active');
                    document.addEventListener('click', (event) => {
                        if (!event.target.closest('.nav-menu')) {
                            categoriesMenu.classList.remove('active');
                        }
                    });
                });
            }
        }

        // Call mobile menu init with categories
        console.log('Calling initMobileMenu with categories:', categories.length);
        initMobileMenu(categories);
        
        return categories;
    } catch (error) {
        console.error('Error loading categories:', error);
        // Still init mobile menu even if categories fail to load
        initMobileMenu([]);
        return [];
    }
}

function updateCartCount() {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        const count = cartManager.getItemCount();
        cartCount.textContent = count;
    }
}

function setupScrollToTopCar() {
    const scrollToTopCar = document.getElementById('scrollToTopCar');
    if (!scrollToTopCar) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollToTopCar.classList.add('visible');
            if (window.scrollY < 600) {
                scrollToTopCar.classList.add('lights-on');
            } else {
                scrollToTopCar.classList.remove('lights-on');
            }
        } else {
            scrollToTopCar.classList.remove('visible');
            scrollToTopCar.classList.remove('lights-on');
        }
    });

    scrollToTopCar.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function setupProductsDropdown() {
    const productsDropdown = document.getElementById('productsDropdown');
    if (!productsDropdown) return;

    productsDropdown.addEventListener('click', (e) => {
        e.preventDefault();
        const menu = document.getElementById('categoriesMenu');
        if (menu) {
            menu.classList.toggle('active');
        }
    });

    document.addEventListener('click', (e) => {
        const menu = document.getElementById('categoriesMenu');
        if (menu && !e.target.closest('.nav-menu')) {
            menu.classList.remove('active');
        }
    });
}

function setLanguage(lang) {
    currentLanguage = lang || 'el';
    localStorage.setItem('language', currentLanguage);
}

function translate(key, lang = currentLanguage) {
    const translations = {
        'el': {
            'home': 'Αρχική',
            'about': 'Σχετικά με εμάς',
            'cart': 'Καλάθι',
            'checkout': 'Ολοκλήρωση Αγοράς',
            'my_orders': 'Οι Παραγγελίες Μου',
            'products': 'Προϊόντα',
            'search': 'Αναζήτηση',
            'add_to_cart': 'Προσθήκη στο Καλάθι',
            'quantity': 'Ποσότητα',
            'price': 'Τιμή',
            'availability': 'Διαθεσιμότητα',
            'product_details': 'Λεπτομέρειες Προϊόντος',
            'recommended': 'Προτεινόμενα Προϊόντα',
            'shipping_method': 'Τρόπος Αποστολής',
            'payment_method': 'Τρόπος Πληρωμής',
            'total': 'Σύνολο',
            'place_order': 'Ολοκλήρωση Παραγγελίας',
            'all_rights_reserved': 'Όλα τα δικαιώματα διατηρούνται',
            'cart_empty': 'Το καλάθι σας είναι κενό',
            'remove': 'Αφαίρεση',
            'update_cart': 'Ενημέρωση Καλαθιού',
            'continue_shopping': 'Συνέχεια Αγορών',
            'error': 'Σφάλμα',
            'success': 'Επιτυχία',
            'out_of_stock': 'Εξαντλημένο',
            'in_stock': 'Διαθέσιμο',
            'loading': 'Φόρτωση...'
        },
        'en': {
            'home': 'Home',
            'about': 'About Us',
            'cart': 'Cart',
            'checkout': 'Checkout',
            'my_orders': 'My Orders',
            'products': 'Products',
            'search': 'Search',
            'add_to_cart': 'Add to Cart',
            'quantity': 'Quantity',
            'price': 'Price',
            'availability': 'Availability',
            'product_details': 'Product Details',
            'recommended': 'Recommended Products',
            'shipping_method': 'Shipping Method',
            'payment_method': 'Payment Method',
            'total': 'Total',
            'place_order': 'Place Order',
            'all_rights_reserved': 'All rights reserved',
            'cart_empty': 'Your cart is empty',
            'remove': 'Remove',
            'update_cart': 'Update Cart',
            'continue_shopping': 'Continue Shopping',
            'error': 'Error',
            'success': 'Success',
            'out_of_stock': 'Out of Stock',
            'in_stock': 'In Stock',
            'loading': 'Loading...'
        }
    };

    return translations[lang]?.[key] || key;
}

async function fetchData(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        showNotification('Σφάλμα: ' + error.message, 'error');
        throw error;
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background-color: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        font-weight: 500;
        max-width: 300px;
    `;
    notification.textContent = message;

    const style = document.createElement('style');
    if (!document.querySelector('style[data-notification-style]')) {
        style.setAttribute('data-notification-style', 'true');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function formatPrice(price) {
    return new Intl.NumberFormat('el-GR', {
        style: 'currency',
        currency: 'EUR'
    }).format(price);
}

function createProductCard(product) {
    const price = product.thursday_price > 0 ? product.thursday_price : product.price_with_vat;
    const oldPrice = product.thursday_price > 0 ? product.price_with_vat : null;
    const inStock = product.instock === 'Yes';

    return `
        <div class="product-card" onclick="goToProduct(${product.id})" role="button" tabindex="0" aria-label="${product.name}">
            <img src="${fixImagePath(product.image)}" alt="${product.name}" class="product-image" loading="lazy">
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price">
                    <span class="price">${formatPrice(price)}</span>
                    ${oldPrice ? `<span class="old-price">${formatPrice(oldPrice)}</span>` : ''}
                </div>
                <div class="availability ${inStock ? 'in-stock' : 'out-of-stock'}">
                    ${product.availability || (inStock ? translate('in_stock') : translate('out_of_stock'))}
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary" onclick="addToCart(event, ${product.id}, 1)">
                        ${translate('add_to_cart')}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function goToProduct(productId) {
    window.location.href = `/pages/product.html?id=${productId}`;
}

async function addToCart(event, productId, quantity = 1) {
    event.stopPropagation();

    if (quantity < 1) {
        showNotification(translate('error'), 'error');
        return;
    }

    try {
        // Get product details from API to verify it exists and get the correct price
        const response = await fetch(`${API_BASE}/products.php?action=get_product&id=${productId}`);
        const product = await response.json();

        if (product.error) {
            showNotification(product.error, 'error');
            return;
        }

        // Check stock availability
        const inStock = product.instock === 'Y' || product.instock === 'Yes';
        if (!inStock || product.quantity < quantity) {
            showNotification('Ανεπαρκές απόθεμα', 'error');
            return;
        }

        // Get the correct price (thursday_price or regular price)
        const price = product.thursday_price > 0 ? product.thursday_price : product.price_with_vat;

        // Add to local cart
        cartManager.addItem(productId, product.name, price, quantity);

        // Show success message
        showNotification(product.name + ' - ' + translate('success'), 'success');
        
        // Update cart count
        updateCartCount();

        // Optional: Also sync with backend for order history/analytics
        const formData = new FormData();
        formData.append('action', 'add_to_cart');
        formData.append('product_id', productId);
        formData.append('quantity', quantity);

        await fetch(`${API_BASE}/cart.php`, {
            method: 'POST',
            body: formData
        }).catch(error => console.log('Backend sync optional:', error));

    } catch (error) {
        showNotification(translate('error'), 'error');
        console.error('Error adding to cart:', error);
    }
}

function getPriceForProduct(product) {
    return product.thursday_price > 0 ? product.thursday_price : product.price_with_vat;
}

function getOldPriceForProduct(product) {
    return product.thursday_price > 0 ? product.price_with_vat : null;
}
// Translation system
let translationCache = {};

async function loadAndApplyTranslations(language) {
    try {
        // Return early if switching to Greek
        if (language === 'el') {
            location.reload();
            return;
        }

        // Check cache first
        if (translationCache[language]) {
            applyTranslations(translationCache[language], language);
            return;
        }

        // Fetch translations from backend using absolute path
        const response = await fetch(`${getAdminUrl('/translations.php?action=get_by_language&language=')}${language}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        console.log('Translation API response:', data);
        
        if (!data.success) throw new Error(data.message || data.error || 'Failed to load translations');
        
        // Backend returns 'translations' as a key-value object
        const translations = data.translations || {};
        console.log('Translations to apply:', Object.keys(translations).length, 'items');
        
        // Cache translations
        translationCache[language] = translations;
        
        // Apply translations to page
        applyTranslations(translations, language);
    } catch (error) {
        console.error('Error loading translations:', error);
        // Silently fail - don't alert, just reload
        setTimeout(() => location.reload(), 1000);
    }
}

function applyTranslations(translations, language) {
    // translations is now a key-value object: { "Greek text": "English text" }
    if (!translations || Object.keys(translations).length === 0) {
        console.warn('No translations loaded');
        return;
    }

    // Traverse all text nodes and replace matching text
    walkAndReplace(document.body, translations);
}

function walkAndReplace(node, translationMap) {
    if (node.nodeType === Node.TEXT_NODE) {
        let text = node.textContent;
        let modified = false;
        
        // Sort keys by length (longest first) to avoid partial replacements
        const sortedKeys = Object.keys(translationMap).sort((a, b) => b.length - a.length);
        
        for (const greekText of sortedKeys) {
            // Use simple string replacement without word boundaries (they don't work with Greek)
            const regex = new RegExp(escapeRegex(greekText), 'g');
            if (regex.test(text)) {
                const newText = text.replace(regex, translationMap[greekText]);
                if (newText !== text) {
                    text = newText;
                    modified = true;
                    console.log(`Replaced: "${greekText}" → "${translationMap[greekText]}"`);
                }
            }
        }
        
        if (modified) {
            node.textContent = text;
        }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Skip script and style tags
        if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') {
            return;
        }

        // Check and replace placeholder, title, aria-label, alt attributes
        const attrs = ['placeholder', 'title', 'aria-label', 'alt', 'value'];
        for (const attr of attrs) {
            if (node.hasAttribute(attr)) {
                let attrValue = node.getAttribute(attr);
                const sortedKeys = Object.keys(translationMap).sort((a, b) => b.length - a.length);
                
                for (const greekText of sortedKeys) {
                    const regex = new RegExp(escapeRegex(greekText), 'g');
                    if (regex.test(attrValue)) {
                        const newValue = attrValue.replace(regex, translationMap[greekText]);
                        if (newValue !== attrValue) {
                            attrValue = newValue;
                            console.log(`Replaced in ${attr}: "${greekText}" → "${translationMap[greekText]}"`);
                        }
                    }
                }
                
                node.setAttribute(attr, attrValue);
            }
        }

        // Recurse to child nodes
        for (let child of node.childNodes) {
            walkAndReplace(child, translationMap);
        }
    }
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Load translations on initial page load if language is not Greek
window.addEventListener('load', () => {
    if (currentLanguage !== 'el' && !translationCache[currentLanguage]) {
        loadAndApplyTranslations(currentLanguage);
    }
});

// Branding system (logo and site name)
async function loadBranding() {
    try {
        // First check localStorage cache
        const cached = localStorage.getItem('branding_cache');
        if (cached) {
            const branding = JSON.parse(cached);
            applyBranding(branding);
        }

        // Then fetch fresh data from backend
        const response = await fetch(getAdminUrl('/logo.php?action=get_branding'));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (!data.success || !data.branding) return;

        const branding = data.branding;
        
        // Cache it for next time
        localStorage.setItem('branding_cache', JSON.stringify(branding));
        
        // Apply to page
        applyBranding(branding);
    } catch (error) {
        console.error('Error loading branding:', error);
        // Use default text
        const logo = document.querySelector('a.logo');
        if (logo && !logo.querySelector('img')) {
            if (!logo.textContent) {
                logo.textContent = 'Poulki Shop';
            }
        }
    }
}

function applyBranding(branding) {
    const logo = document.querySelector('a.logo');
    if (!logo) return;

    if (branding.logo_path) {
        // Show logo image instead of text
        if (!logo.querySelector('img')) {
            logo.innerHTML = '';
            const img = document.createElement('img');
            img.src = fixImagePath(branding.logo_path);
            img.alt = branding.site_name || 'Logo';
            img.style.maxHeight = '100px';
            img.style.objectFit = 'contain';
            img.style.marginTop = '4%';
            logo.appendChild(img);
        }
        
        // Set favicon from logo
        setFavicon(fixImagePath(branding.logo_path));
    } else if (branding.site_name && logo.textContent === 'Poulki Shop') {
        // Only update text if it's different
        logo.textContent = branding.site_name;
    }
}

// Function to set favicon dynamically
function setFavicon(logoPath) {
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.type = 'image/png';
        document.head.appendChild(favicon);
    }
    favicon.href = logoPath;
}

// Mobile Hamburger Menu Functionality
function initMobileMenu(categories = []) {
    console.log('initMobileMenu called with categories:', categories.length);
    
    const hamburger = document.getElementById('hamburgerMenu');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileOverlay = document.getElementById('mobileMenuOverlay');
    const closeBtn = document.getElementById('closeMenu');
    const mobileMenuContent = document.getElementById('mobileMenuContent');

    console.log('Mobile menu elements:', { hamburger, mobileMenu, mobileOverlay, closeBtn, mobileMenuContent });

    if (!hamburger || !mobileMenu || !mobileOverlay || !mobileMenuContent) {
        console.error('Mobile menu elements not found!');
        return;
    }

    // Build the menu HTML directly
    let menuHTML = '<a href="index.html" class="nav-item" style="display: block; padding: 12px 20px;">Αρχική</a>';

    // Build products menu if categories exist
    if (categories && categories.length > 0) {
        const hierarchy = buildHierarchy(categories);
        console.log('Built hierarchy:', hierarchy);
        
        const getCategoryPath = () => {
            const currentPath = window.location.pathname;
            return currentPath.includes('/pages/') ? 'category.html' : 'pages/category.html';
        };

        if (hierarchy.children && hierarchy.children.length > 0) {
            menuHTML += '<li style="list-style: none;"><a href="#" class="nav-item mobile-products-toggle" style="display: block; padding: 12px 20px;">Προϊόντα <i class="bx bxs-chevron-down products-arrow arrow"></i></a>';
            menuHTML += '<ul class="products-sub-menu sub-menu mobile-submenu" style="display: none;">';
            
            function buildSubmenuHTML(node) {
                let html = '';
                if (node.children && node.children.length > 0) {
                    node.children.forEach(child => {
                        const href = child.cat_id ? `${getCategoryPath()}?id=${child.cat_id}` : '#';
                        const hasChildren = child.children && child.children.length > 0;
                        
                        if (hasChildren) {
                            html += `<li style="list-style: none;"><a href="#" class="mobile-submenu-toggle" style="display: block; padding: 10px 20px; padding-left: ${30 + (node.level || 0) * 10}px;">${child.name} <i class="bx bxs-chevron-down" style="float: right; font-size: 16px;"></i></a>`;
                            html += '<ul class="mobile-submenu" style="display: none; list-style: none; margin: 0; padding: 0;">';
                            html += buildSubmenuHTML(child);
                            html += '</ul>';
                        } else {
                            html += `<li style="list-style: none;"><a href="${href}" class="nav-item" style="display: block; padding: 10px 20px; padding-left: ${30 + (node.level || 0) * 10}px;">${child.name}</a>`;
                        }
                        html += '</li>';
                    });
                }
                return html;
            }

            menuHTML += buildSubmenuHTML(hierarchy);
            menuHTML += '</ul></li>';
        }
    }

    // Add About and Orders
    menuHTML += '<a href="pages/about.html" class="nav-item" style="display: block; padding: 12px 20px;">Σχετικά</a>';
    menuHTML += '<a href="pages/my-orders.html" class="nav-item" style="display: block; padding: 12px 20px;">Παραγγελίες</a>';

    // Set the HTML
    mobileMenuContent.innerHTML = menuHTML;
    console.log('Mobile menu HTML set, content length:', mobileMenuContent.innerHTML.length);

    // Add click handlers for all mobile menu toggles
    const productToggle = mobileMenuContent.querySelector('.mobile-products-toggle');
    if (productToggle) {
        productToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const submenu = this.nextElementSibling;
            const arrow = this.querySelector('.arrow');
            
            if (submenu && submenu.classList.contains('mobile-submenu')) {
                const isHidden = submenu.style.display === 'none';
                submenu.style.display = isHidden ? 'block' : 'none';
                if (arrow) arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        });
    }

    // Add click handlers for all nested submenu toggles
    const submenuToggles = mobileMenuContent.querySelectorAll('.mobile-submenu-toggle');
    submenuToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const submenu = this.nextElementSibling;
            const arrow = this.querySelector('i');
            
            if (submenu && submenu.classList.contains('mobile-submenu')) {
                const isHidden = submenu.style.display === 'none';
                submenu.style.display = isHidden ? 'block' : 'none';
                if (arrow) arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        });
    });

    // Helper function to build hierarchy
    function buildHierarchy(cats) {
        const tree = {
            name: 'Root',
            level: 0,
            children: []
        };
        
        cats.forEach(cat => {
            let parts = cat.category.split(/[»>]/).map(p => p.trim()).filter(p => p);
            let currentNode = tree;
            let level = 0;
            
            parts.forEach((part, index) => {
                let child = currentNode.children.find(c => c.name === part);
                
                if (!child) {
                    child = {
                        name: part,
                        level: level,
                        cat_id: index === parts.length - 1 ? cat.cat_id : null,
                        children: []
                    };
                    currentNode.children.push(child);
                } else if (index === parts.length - 1) {
                    child.cat_id = cat.cat_id;
                }
                
                level++;
                currentNode = child;
            });
        });
        
        return tree;
    }

    // Function to close menu
    function closeMenu() {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
        mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Function to open menu
    function openMenu() {
        hamburger.classList.add('active');
        mobileMenu.classList.add('active');
        mobileOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Click hamburger to toggle menu
    hamburger.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('Hamburger clicked, menu active:', mobileMenu.classList.contains('active'));
        if (mobileMenu.classList.contains('active')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // Click close button to close menu
    closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        closeMenu();
    });

    // Click overlay to close menu
    mobileOverlay.addEventListener('click', function(e) {
        e.stopPropagation();
        closeMenu();
    });

    // Handle dropdown toggles in mobile menu
    mobileMenuContent.addEventListener('click', function(e) {
        if (e.target.classList.contains('mobile-products-toggle') || e.target.classList.contains('mobile-submenu-toggle')) {
            e.preventDefault();
            const toggle = e.target.classList.contains('mobile-products-toggle') ? e.target : e.target.closest('.mobile-submenu-toggle');
            const submenu = toggle.nextElementSibling;
            
            if (submenu && submenu.classList.contains('mobile-submenu')) {
                const isHidden = submenu.style.display === 'none';
                submenu.style.display = isHidden ? 'block' : 'none';
                
                // Rotate the arrow
                const arrow = toggle.querySelector('i');
                if (arrow) {
                    arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
                }
            }
        } else if (e.target.tagName === 'A' && e.target.href && e.target.href.includes('.html')) {
            closeMenu();
        }
    });

    // Prevent menu from closing when clicking inside
    mobileMenu.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    console.log('Mobile menu initialized successfully');
}