// Admin Panel JavaScript

const ADMIN_API_BASE = 'admin';

// Detect if we're on Plesk preview path and build the correct base path
function getPleskBasePath() {
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

const adminBasePath = getPleskBasePath();

// Helper functions for dynamic URLs (in case admin.js is loaded from different context)
function getAdminApiUrl(path) {
    return window.location.origin + adminBasePath + '/backend/admin' + path;
}

function getApiUrl(path) {
    return window.location.origin + adminBasePath + '/backend/api' + path;
}
let isAdminLoggedIn = false;

document.addEventListener('DOMContentLoaded', async function() {
    // Check if already logged in
    if (localStorage.getItem('adminLoggedIn')) {
        showDashboard();
    }

    // Setup login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Setup menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            showPage(page);

            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Setup product form
    const productForm = document.getElementById('productForm');
    if (productForm) {
        // Auto-generate slug from category name
        const categoryNameInput = document.getElementById('categoryName');
        if (categoryNameInput) {
            categoryNameInput.addEventListener('input', (e) => {
                const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                document.getElementById('categorySlug').value = slug;
            });
        }

        productForm.addEventListener('submit', handleProductFormSubmit);
    }

    // Setup category form
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        const categoryNameInput = document.getElementById('categoryName');
        if (categoryNameInput) {
            categoryNameInput.addEventListener('input', (e) => {
                const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                document.getElementById('categorySlug').value = slug;
            });
        }

        categoryForm.addEventListener('submit', handleCategoryFormSubmit);
    }
});

async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const formData = new FormData();
        formData.append('action', 'login');
        formData.append('username', username);
        formData.append('password', password);

        const loginUrl = getAdminApiUrl('/auth.php');
        console.log('Logging in to:', loginUrl);

        const response = await fetch(loginUrl, {
            method: 'POST',
            body: formData
        });

        console.log('Login response status:', response.status);

        // Read the response text first
        const text = await response.text();
        console.log('Login response text:', text);

        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Response was:', text);
            alert('Σφάλμα διακομιστή: Άκυρη απάντηση. Ελέγξτε τη σύνδεση βάσης δεδομένων.');
            return;
        }

        if (data.success) {
            localStorage.setItem('adminLoggedIn', true);
            localStorage.setItem('adminUsername', username);
            showDashboard();
        } else {
            alert('Σφάλμα: ' + (data.error || 'Άγνωστο σφάλμα'));
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Σφάλμα: ' + error.message);
    }
}

function showDashboard() {
    isAdminLoggedIn = true;
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'block';
    document.getElementById('adminUsername').textContent = localStorage.getItem('adminUsername') || 'Admin';

    showPage('dashboard');
    loadDashboardStats();
}

function showPage(pageName) {
    const pages = document.querySelectorAll('.admin-page');
    pages.forEach(page => page.classList.remove('active'));

    const page = document.getElementById('page-' + pageName);
    if (page) {
        page.classList.add('active');

        if (pageName === 'appearance') {
            loadAppearanceSettings();
        } else if (pageName === 'products') {
            loadProductCategories();
            initProductForm();
            loadProducts();
        } else if (pageName === 'orders') {
            loadOrders();
        } else if (pageName === 'shipping') {
            loadShippingMethods();
        } else if (pageName === 'payment') {
            loadPaymentMethods();
        } else if (pageName === 'categories') {
            loadCategories();
            loadCustomCategories();
            initCategoryForm();
        } else if (pageName === 'translations') {
            loadTranslations();
        } else if (pageName === 'settings') {
            loadSettings();
        }
    }
}

async function loadDashboardStats() {
    try {
        const ordersResponse = await fetch(getAdminApiUrl('/orders.php?action=get_orders&page=1'));
        const ordersData = await ordersResponse.json();
        document.getElementById('totalOrders').textContent = ordersData.total || 0;

        const productsResponse = await fetch(getApiUrl('/products.php?action=get_products&page=1&limit=1'));
        const productsData = await productsResponse.json();
        document.getElementById('totalProducts').textContent = productsData.total || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadAppearanceSettings() {
    try {
        const formData = new FormData();
        formData.append('action', 'get_settings');

        const settingsResponse = await fetch(getAdminApiUrl('/settings.php'), {
            method: 'POST',
            body: formData
        });

        const settings = await settingsResponse.json();

        document.getElementById('aboutUsText').value = settings.about_us_text || '';
        
        // Load featured products UI
        await loadFeaturedProductsUI();
        document.getElementById('mapsIframeUrl').value = settings.maps_iframe_url || '';

        // Load logo settings
        await loadLogoSettings();

        // Load search image
        await loadSearchImage();

        // Load banners
        await loadBannersList();
    } catch (error) {
        console.error('Error loading appearance settings:', error);
    }
}

// Search Image functions
async function loadSearchImage() {
    try {
        const formData = new FormData();
        formData.append('action', 'get_search_image');

        const response = await fetch(getAdminApiUrl('/search-image.php'), {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success && data.search_image) {
            const previewImg = document.getElementById('searchImagePreviewImg');
            const previewText = document.getElementById('searchImagePreviewText');
            
            if (previewImg && previewText) {
                previewImg.src = '../../' + data.search_image;
                previewImg.style.display = 'block';
                previewText.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading search image:', error);
    }
}

async function uploadSearchImage() {
    const file = document.getElementById('searchImageUpload').files[0];
    if (!file) {
        alert('Επιλέξτε ένα αρχείο');
        return;
    }

    const formData = new FormData();
    formData.append('action', 'upload_search_image');
    formData.append('image', file);

    try {
        const response = await fetch(getAdminApiUrl('/search-image.php'), {
            method: 'POST',
            body: formData
        });

        const text = await response.text();
        console.log('Upload response:', text);

        if (!text) {
            alert('Σφάλμα: Κενή απάντηση από το διακομιστή');
            return;
        }

        try {
            const data = JSON.parse(text);
            if (data.success) {
                alert('Εικόνα αναζήτησης ανέβηκε με επιτυχία');
                document.getElementById('searchImageUpload').value = '';
                await loadSearchImage();
            } else {
                alert('Σφάλμα: ' + (data.error || 'Άγνωστο σφάλμα'));
            }
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            alert('Σφάλμα: Άκυρη απάντηση από το διακομιστή');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Σφάλμα: ' + error.message);
    }
}

async function removeSearchImage() {
    if (!confirm('Σίγουρα θέλετε να αφαιρέσετε την εικόνα αναζήτησης;')) {
        return;
    }

    const formData = new FormData();
    formData.append('action', 'delete_search_image');

    try {
        const response = await fetch(getAdminApiUrl('/search-image.php'), {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('Εικόνα αναζήτησης αφαιρέθηκε');
            const previewImg = document.getElementById('searchImagePreviewImg');
            const previewText = document.getElementById('searchImagePreviewText');
            
            if (previewImg && previewText) {
                previewImg.style.display = 'none';
                previewText.style.display = 'block';
                previewText.textContent = 'Κάντε κλικ στο κουμπί ανέβασης για να επιλέξετε μια εικόνα';
            }
        } else {
            alert('Σφάλμα: ' + data.error);
        }
    } catch (error) {
        alert('Σφάλμα: ' + error.message);
    }
}

// Listen for search image file input changes to show preview
document.addEventListener('change', (e) => {
    if (e.target.id === 'searchImageUpload' && e.target.files.length) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const previewImg = document.getElementById('searchImagePreviewImg');
            const previewText = document.getElementById('searchImagePreviewText');
            previewImg.src = event.target.result;
            previewImg.style.display = 'block';
            previewText.style.display = 'none';
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});

async function loadBannersList() {
    try {
        const formData = new FormData();
        formData.append('action', 'get_banners');

        const response = await fetch(getAdminApiUrl('/banners.php'), {
            method: 'POST',
            body: formData
        });

        const banners = await response.json();

        const list = document.getElementById('bannersList');
        list.innerHTML = banners.map(banner => {
            // Ensure path starts with /
            const imagePath = banner.image_path.startsWith('/') ? banner.image_path : '/' + banner.image_path;
            return `
            <div class="banner-item">
                <img src="${imagePath}" alt="${banner.title}" class="banner-preview">
                <div class="banner-info">
                    <div class="banner-title">${banner.title}</div>
                    <div class="banner-path">${banner.image_path}</div>
                </div>
                <button class="btn btn-danger" onclick="deleteBanner(${banner.id})">Διαγραφή</button>
            </div>
        `}).join('');
    } catch (error) {
        console.error('Error loading banners:', error);
    }
}

async function uploadBanner() {
    const file = document.getElementById('bannerUpload').files[0];
    if (!file) {
        alert('Επιλέξτε ένα αρχείο');
        return;
    }

    const title = document.getElementById('bannerTitle').value || 'Banner';
    const link = document.getElementById('bannerLink').value;
    const position = document.getElementById('bannerPosition').value || 0;

    const formData = new FormData();
    formData.append('action', 'upload_banner');
    formData.append('image', file);
    formData.append('title', title);
    formData.append('link', link);
    formData.append('position', position);

    try {
        const response = await fetch(getAdminApiUrl('/banners.php'), {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('Banner ανέβηκε με επιτυχία');
            document.getElementById('bannerUpload').value = '';
            document.getElementById('bannerTitle').value = '';
            document.getElementById('bannerLink').value = '';
            document.getElementById('bannerPosition').value = '0';
            await loadBannersList();
        } else {
            alert('Σφάλμα: ' + data.error);
        }
    } catch (error) {
        alert('Σφάλμα: ' + error.message);
    }
}

async function deleteBanner(bannerId) {
    if (confirm('Σίγουρα θέλετε να διαγράψετε αυτό το banner;')) {
        const formData = new FormData();
        formData.append('action', 'delete_banner');
        formData.append('id', bannerId);

        try {
            const response = await fetch(getAdminApiUrl('/banners.php'), {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                await loadBannersList();
            }
        } catch (error) {
            console.error('Error deleting banner:', error);
        }
    }
}

async function saveAppearanceSettings() {
    const aboutUsText = document.getElementById('aboutUsText').value;
    const mapsIframeUrl = document.getElementById('mapsIframeUrl').value;

    const formData = new FormData();
    formData.append('action', 'update_settings');
    formData.append('about_us_text', aboutUsText);
    formData.append('maps_iframe_url', mapsIframeUrl);

    try {
        const response = await fetch(getAdminApiUrl('/settings.php'), {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('Ρυθμίσεις αποθηκεύτηκαν');
        }
    } catch (error) {
        alert('Σφάλμα: ' + error.message);
    }
}

// Logo settings functions
async function saveLogoSettings() {
    const siteName = document.getElementById('siteName').value || 'Poulki Shop';
    const logoUpload = document.getElementById('logoUpload');
    
    // If no file selected, just save the site name
    if (!logoUpload.files.length) {
        try {
            const formData = new FormData();
            formData.append('action', 'save_logo');
            formData.append('site_name', siteName);
            formData.append('logo_path', document.getElementById('logoPreviewImg').dataset.path || null);

            const response = await fetch(getAdminApiUrl('/logo.php'), {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                alert('Ρυθμίσεις αποθηκεύτηκαν');
                await loadLogoSettings();
            } else {
                alert('Σφάλμα: ' + (data.error || 'Αγνωστο σφάλμα'));
            }
        } catch (error) {
            alert('Σφάλμα: ' + error.message);
            console.error('Save logo error:', error);
        }
        return;
    }

    // Upload logo
    const formData = new FormData();
    formData.append('action', 'upload_logo');
    formData.append('site_name', siteName);
    formData.append('logo', logoUpload.files[0]);

    try {
        const response = await fetch(getAdminApiUrl('/logo.php'), {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('Λογότυπο ανέβηκε με επιτυχία');
            await loadLogoSettings();
            logoUpload.value = '';
        } else {
            alert('Σφάλμα: ' + (data.error || 'Αγνωστο σφάλμα'));
        }
    } catch (error) {
        alert('Σφάλμα: ' + error.message);
        console.error('Upload logo error:', error);
    }
}

async function removeLogo() {
    if (!confirm('Σίγουρα θέλετε να αφαιρέσετε το λογότυπο;')) {
        return;
    }

    const formData = new FormData();
    formData.append('action', 'remove_logo');

    try {
        const response = await fetch(getAdminApiUrl('/logo.php'), {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('Λογότυπο αφαιρέθηκε');
            loadLogoSettings();
        } else {
            alert('Σφάλμα: ' + data.error);
        }
    } catch (error) {
        alert('Σφάλμα: ' + error.message);
    }
}

async function loadLogoSettings() {
    try {
        const response = await fetch(getAdminApiUrl('/logo.php?action=get_branding'));
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();

        if (data.success && data.branding) {
            const branding = data.branding;
            const siteNameInput = document.getElementById('siteName');
            const previewImg = document.getElementById('logoPreviewImg');
            const previewText = document.getElementById('logoPreviewText');
            
            if (siteNameInput) {
                siteNameInput.value = branding.site_name || 'Poulki Shop';
            }
            
            if (previewImg && previewText) {
                if (branding.logo_path) {
                    previewImg.src = '../../' + branding.logo_path;
                    previewImg.dataset.path = branding.logo_path;
                    previewImg.style.display = 'block';
                    previewText.style.display = 'none';
                } else {
                    previewImg.style.display = 'none';
                    previewText.style.display = 'block';
                    previewText.textContent = branding.site_name || 'Poulki Shop';
                    previewImg.dataset.path = null;
                }
            }
        } else {
            console.warn('No branding data returned:', data);
        }
    } catch (error) {
        console.error('Error loading logo settings:', error);
        // Show default
        const siteNameInput = document.getElementById('siteName');
        if (siteNameInput) {
            siteNameInput.value = 'Poulki Shop';
        }
    }
}

// Listen for logo file input changes to show preview
document.addEventListener('change', (e) => {
    if (e.target.id === 'logoUpload' && e.target.files.length) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const previewImg = document.getElementById('logoPreviewImg');
            const previewText = document.getElementById('logoPreviewText');
            previewImg.src = event.target.result;
            previewImg.style.display = 'block';
            previewText.style.display = 'none';
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});
async function importXML() {
    if (confirm('Σίγουρα θέλετε να εισαγάγετε τα προϊόντα από το XML;')) {
        const statusDiv = document.getElementById('importStatus');
        statusDiv.style.display = 'block';
        statusDiv.textContent = 'Γίνεται εισαγωγή...';

        const formData = new FormData();
        formData.append('action', 'import_xml');

        try {
            const response = await fetch(getApiUrl('/products.php'), {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                statusDiv.textContent = 'Εισαγωγή ολοκληρώθηκε! ' + data.imported + ' προϊόντα εισήχθησαν.';
                loadProducts();
            } else {
                statusDiv.textContent = 'Σφάλμα: ' + data.error;
            }
        } catch (error) {
            statusDiv.textContent = 'Σφάλμα: ' + error.message;
        }
    }
}

async function loadProducts(page = 1) {
    try {
        const response = await fetch(getApiUrl(`/products.php?action=get_products&page=${page}&limit=20`));
        const data = await response.json();

        const list = document.getElementById('productsList');
        list.innerHTML = data.products.map(product => `
            <div class="list-item">
                <div class="list-item-content">
                    <div class="list-item-title">${product.name}</div>
                    <div class="list-item-subtitle">ID: ${product.unique_id} | Κατηγορία: ${product.category} | Τιμή: ${product.price_with_vat}€</div>
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-primary" onclick="editProduct(${product.id})">✏️ Επεξεργασία</button>
                    <button class="btn btn-danger" onclick="deleteProduct(${product.id})">🗑️ Διαγραφή</button>
                </div>
            </div>
        `).join('');

        document.getElementById('totalProducts').textContent = data.total;
        
        // Create pagination
        createProductsPagination(data.pages, page);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function createProductsPagination(pages, currentPage) {
    const paginationContainer = document.getElementById('productsPagination');
    if (!paginationContainer || pages <= 1) return;

    let html = '';

    if (currentPage > 1) {
        html += `<a href="#" onclick="loadProducts(${currentPage - 1}); return false;">Προηγούμενη</a>`;
    }

    for (let i = Math.max(1, currentPage - 2); i <= Math.min(pages, currentPage + 2); i++) {
        if (i === currentPage) {
            html += `<span class="active">${i}</span>`;
        } else {
            html += `<a href="#" onclick="loadProducts(${i}); return false;">${i}</a>`;
        }
    }

    if (currentPage < pages) {
        html += `<a href="#" onclick="loadProducts(${currentPage + 1}); return false;">Επόμενη</a>`;
    }

    paginationContainer.innerHTML = html;
}

async function editProduct(productId) {
    try {
        const response = await fetch(getAdminApiUrl('/products-crud.php?id=' + productId));
        const result = await response.json();

        if (!result.success || !result.data) {
            alert('Σφάλμα: Δεν βρέθηκε το προϊόν');
            return;
        }

        const product = result.data;

        // Populate form fields with product data
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productPrice').value = product.price_with_vat || '';
        document.getElementById('productCategory').value = product.cat_id ? 'custom_' + product.cat_id : '';
        document.getElementById('productCatId').value = product.cat_id || '';
        document.getElementById('productModel').value = product.model || '';
        document.getElementById('productManufacturer').value = product.manufacturer || '';
        document.getElementById('productWeight').value = product.weight || '';
        document.getElementById('productQuantity').value = product.quantity || 1;
        document.getElementById('productMPA').value = product.mpa || '';
        document.getElementById('productGAN').value = product.gan || '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productLink').value = product.link || '';
        document.getElementById('productThursdayPrice').value = product.thursday_price || '';
        document.getElementById('productInstock').value = product.instock || 'Yes';

        // Store the product ID for update
        document.getElementById('productForm').dataset.editingId = productId;

        // Change button text to indicate edit mode
        const submitBtn = document.querySelector('#productForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Ενημέρωση Προϊόντος';
        }

        // Show cancel button
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) {
            cancelBtn.style.display = 'inline-block';
        }

        // Scroll to form
        document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });

        // Highlight the section to draw attention
        const section = document.querySelector('.admin-section:has(#productForm)');
        if (section) {
            section.style.backgroundColor = '#fffacd';
            setTimeout(() => {
                section.style.backgroundColor = '';
            }, 3000);
        }
    } catch (error) {
        console.error('Error loading product:', error);
        alert('Σφάλμα: ' + error.message);
    }
}

async function deleteProduct(productId) {
    if (!confirm('Είστε σίγουρος ότι θέλετε να διαγράψετε αυτό το προϊόν;')) {
        return;
    }

    try {
        const formData = new FormData();
        formData.append('_method', 'DELETE');
        formData.append('id', productId);

        const response = await fetch(getAdminApiUrl('/products-crud.php'), {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert('Προϊόν διαγράφηκε με επιτυχία');
            loadProducts();
        } else {
            alert('Σφάλμα: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Σφάλμα: ' + error.message);
    }
}

function cancelProductEdit() {
    const form = document.getElementById('productForm');
    form.reset();
    form.dataset.editingId = '';
    
    const submitBtn = document.querySelector('#productForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Ανέβασμα Προϊόντος';
    }
    
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }
    
    const statusDiv = document.getElementById('productFormStatus');
    if (statusDiv) {
        statusDiv.style.display = 'none';
    }
}

async function loadOrders(page = 1, dateFrom = null, dateTo = null) {
    try {
        let url = getAdminApiUrl('/orders.php?action=get_orders&page=' + page);
        if (dateFrom) url += `&date_from=${dateFrom}`;
        if (dateTo) url += `&date_to=${dateTo}`;

        const response = await fetch(url);
        const data = await response.json();

        const list = document.getElementById('ordersList');
        list.innerHTML = data.orders.map(order => {
            const statusText = {
                'pending': 'Εκκρεμής',
                'sent': 'Στάλθηκε',
                'not_sent': 'Δεν Στάλθηκε',
                'cancelled': 'Ακυρώθηκε',
                'returned': 'Επιστράφηκε'
            }[order.status] || order.status;

            return `
                <div class="list-item">
                    <div class="list-item-content">
                        <div class="list-item-title">${order.order_code}</div>
                        <div class="list-item-subtitle">
                            Πελάτης: ${order.customer_name} | Σύνολο: ${order.total_amount}€ | Κατάσταση: ${statusText}
                        </div>
                    </div>
                    <div class="list-item-actions">
                        <button class="btn btn-primary" onclick="openOrderModal(${order.id})">Λεπτομέρειες</button>
                    </div>
                </div>
            `;
        }).join('');

        // Pagination
        createOrderPagination(data.pages, page, dateFrom, dateTo);
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function createOrderPagination(pages, currentPage, dateFrom, dateTo) {
    const paginationContainer = document.getElementById('ordersPagination');
    if (!paginationContainer || pages <= 1) return;

    let html = '';

    if (currentPage > 1) {
        html += `<a href="#" onclick="event.preventDefault(); loadOrders(${currentPage - 1}, '${dateFrom}', '${dateTo}')">Προηγούμενη</a>`;
    }

    for (let i = Math.max(1, currentPage - 2); i <= Math.min(pages, currentPage + 2); i++) {
        if (i === currentPage) {
            html += `<span class="active">${i}</span>`;
        } else {
            html += `<a href="#" onclick="event.preventDefault(); loadOrders(${i}, '${dateFrom}', '${dateTo}')">${i}</a>`;
        }
    }

    if (currentPage < pages) {
        html += `<a href="#" onclick="event.preventDefault(); loadOrders(${currentPage + 1}, '${dateFrom}', '${dateTo}')">Επόμενη</a>`;
    }

    paginationContainer.innerHTML = html;
}

function filterOrders() {
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;
    loadOrders(1, dateFrom, dateTo);
}

async function openOrderModal(orderId) {
    try {
        const response = await fetch(getAdminApiUrl('/orders.php?action=get_order&id=' + orderId));
        const order = await response.json();

        const statusOptions = ['pending', 'sent', 'not_sent', 'cancelled', 'returned'];
        const statusText = {
            'pending': 'Εκκρεμής',
            'sent': 'Στάλθηκε',
            'not_sent': 'Δεν Στάλθηκε',
            'cancelled': 'Ακυρώθηκε',
            'returned': 'Επιστράφηκε'
        };

        let itemsHtml = '';
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                itemsHtml += `
                    <div class="order-item-line">
                        <span>${item.name} x ${item.quantity}</span>
                        <span>${(item.price * item.quantity).toFixed(2)}€</span>
                    </div>
                `;
            });
        }

        const html = `
            <div class="order-detail">
                <div class="order-detail-item">
                    <div class="order-detail-label">Κωδικός Παραγγελίας</div>
                    <div class="order-detail-value">${order.order_code}</div>
                </div>
                <div class="order-detail-item">
                    <div class="order-detail-label">Ημερομηνία</div>
                    <div class="order-detail-value">${new Date(order.created_at).toLocaleDateString('el-GR')}</div>
                </div>
                <div class="order-detail-item">
                    <div class="order-detail-label">Πελάτης</div>
                    <div class="order-detail-value">${order.customer_name}</div>
                </div>
                <div class="order-detail-item">
                    <div class="order-detail-label">Email</div>
                    <div class="order-detail-value">${order.customer_email}</div>
                </div>
                <div class="order-detail-item">
                    <div class="order-detail-label">Τηλέφωνο</div>
                    <div class="order-detail-value">${order.customer_phone}</div>
                </div>
                <div class="order-detail-item">
                    <div class="order-detail-label">Διεύθυνση</div>
                    <div class="order-detail-value">${order.customer_address}</div>
                </div>
                <div class="order-detail-item">
                    <div class="order-detail-label">Πόλη</div>
                    <div class="order-detail-value">${order.customer_city || '-'}</div>
                </div>
                <div class="order-detail-item">
                    <div class="order-detail-label">Νομός</div>
                    <div class="order-detail-value">${order.customer_state || '-'}</div>
                </div>
                <div class="order-detail-item">
                    <div class="order-detail-label">ΤΚ</div>
                    <div class="order-detail-value">${order.customer_postal_code || '-'}</div>
                </div>
                <div class="order-detail-item">
                    <div class="order-detail-label">Σύνολο</div>
                    <div class="order-detail-value">${order.total_amount}€</div>
                </div>
            </div>

            <div class="order-items-list">
                <strong>Προϊόντα:</strong>
                ${itemsHtml}
            </div>

            <div class="form-group">
                <label for="orderStatus">Κατάσταση</label>
                <select id="orderStatus">
                    ${statusOptions.map(status => 
                        `<option value="${status}" ${order.status === status ? 'selected' : ''}>${statusText[status]}</option>`
                    ).join('')}
                </select>
                <button class="btn btn-primary" onclick="updateOrderStatus(${orderId})">Ενημέρωση Κατάστασης</button>
            </div>

            <div class="form-group">
                <label for="trackingCode">Κωδικός Αποστολής</label>
                <input type="text" id="trackingCode" value="${order.tracking_code || ''}">
                <button class="btn btn-primary" onclick="addTrackingCode(${orderId})">Αποθήκευση</button>
            </div>

            <div class="form-group">
                <label for="orderNotes">Σημειώσεις</label>
                <textarea id="orderNotes" rows="4">${order.notes || ''}</textarea>
                <button class="btn btn-primary" onclick="saveOrderNotes(${orderId})">Αποθήκευση</button>
            </div>

            ${order.tracking_code ? `
                <div class="form-group">
                    <button class="btn btn-secondary" onclick="copyShippingText(${orderId})">Αντιγραφή Κειμένου Αποστολής</button>
                </div>
            ` : ''}

            <div class="form-group">
                <button class="btn btn-success" onclick="generateOrderPDF(${orderId}, '${order.order_code}')">📄 Εκτύπωση PDF</button>
            </div>
        `;

        document.getElementById('orderModalContent').innerHTML = html;
        document.getElementById('orderModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading order:', error);
    }
}

function closeOrderModal() {
    document.getElementById('orderModal').style.display = 'none';
}

async function updateOrderStatus(orderId) {
    const status = document.getElementById('orderStatus').value;

    const formData = new FormData();
    formData.append('action', 'update_order_status');
    formData.append('order_id', orderId);
    formData.append('status', status);

    try {
        const response = await fetch(getAdminApiUrl('/orders.php'), {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('Κατάσταση ενημερώθηκε');
            loadOrders();
        }
    } catch (error) {
        alert('Σφάλμα: ' + error.message);
    }
}

async function addTrackingCode(orderId) {
    const trackingCode = document.getElementById('trackingCode').value;

    if (!trackingCode) {
        alert('Εισάγετε κωδικό αποστολής');
        return;
    }

    const formData = new FormData();
    formData.append('action', 'add_tracking');
    formData.append('order_id', orderId);
    formData.append('tracking_code', trackingCode);

    try {
        const response = await fetch(getAdminApiUrl('/orders.php'), {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('Κωδικός αποστολής αποθηκεύθηκε');
            loadOrders();
        }
    } catch (error) {
        alert('Σφάλμα: ' + error.message);
    }
}

async function saveOrderNotes(orderId) {
    const notes = document.getElementById('orderNotes').value;

    const formData = new FormData();
    formData.append('action', 'add_notes');
    formData.append('order_id', orderId);
    formData.append('notes', notes);

    try {
        const response = await fetch(getAdminApiUrl('/orders.php'), {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('Σημειώσεις αποθηκεύτηκαν');
        }
    } catch (error) {
        alert('Σφάλμα: ' + error.message);
    }
}

async function copyShippingText(orderId) {
    try {
        const response = await fetch(getAdminApiUrl('/orders.php?action=get_shipping_text&id=' + orderId));
        const data = await response.json();

        if (data.text) {
            navigator.clipboard.writeText(data.text);
            alert('Κείμενο αντιγράφηκε στο clipboard');
        }
    } catch (error) {
        alert('Σφάλμα: ' + error.message);
    }
}

function exportOrdersToCSV() {
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;

    let url = getAdminApiUrl('/export-orders.php');
    if (dateFrom || dateTo) {
        url += '?';
        if (dateFrom) url += `date_from=${dateFrom}&`;
        if (dateTo) url += `date_to=${dateTo}`;
    }

    window.location.href = url;
}

async function loadShippingMethods() {
    try {
        const formData = new FormData();
        formData.append('action', 'get_shipping_methods');

        const response = await fetch(getAdminApiUrl('/shipping.php'), {
            method: 'POST',
            body: formData
        });

        const methods = await response.json();

        const list = document.getElementById('shippingList');
        list.innerHTML = methods.map(method => `
            <div class="list-item">
                <div class="list-item-content">
                    <div class="list-item-title">${method.name}</div>
                    <div class="list-item-subtitle">${method.description} - ${method.cost}€</div>
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-danger" onclick="deleteShippingMethod(${method.id})">Διαγραφή</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading shipping methods:', error);
    }
}

async function createShippingMethod() {
    const name = document.getElementById('shippingName').value;
    const description = document.getElementById('shippingDescription').value;
    const cost = document.getElementById('shippingCost').value;

    if (!name) {
        alert('Εισάγετε όνομα');
        return;
    }

    const formData = new FormData();
    formData.append('action', 'create_shipping');
    formData.append('name', name);
    formData.append('description', description);
    formData.append('cost', cost);

    try {
        const response = await fetch(getAdminApiUrl('/shipping.php'), {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('Τρόπος αποστολής δημιουργήθηκε');
            document.getElementById('shippingName').value = '';
            document.getElementById('shippingDescription').value = '';
            document.getElementById('shippingCost').value = '0';
            loadShippingMethods();
        }
    } catch (error) {
        alert('Σφάλμα: ' + error.message);
    }
}

async function deleteShippingMethod(id) {
    if (confirm('Σίγουρα θέλετε να διαγράψετε αυτόν τον τρόπο αποστολής;')) {
        const formData = new FormData();
        formData.append('action', 'delete_shipping');
        formData.append('id', id);

        try {
            const response = await fetch(getAdminApiUrl('/shipping.php'), {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                loadShippingMethods();
            }
        } catch (error) {
            console.error('Error deleting shipping method:', error);
        }
    }
}

async function loadPaymentMethods() {
    try {
        const formData = new FormData();
        formData.append('action', 'get_payment_methods');

        const response = await fetch(getAdminApiUrl('/payment.php'), {
            method: 'POST',
            body: formData
        });

        const methods = await response.json();

        const list = document.getElementById('paymentList');
        list.innerHTML = methods.map(method => `
            <div class="list-item">
                <div class="list-item-content">
                    <div class="list-item-title">${method.name}</div>
                    <div class="list-item-subtitle">${method.description}</div>
                    <div class="list-item-subtitle">Κόστος: €${parseFloat(method.cost || 0).toFixed(2)}</div>
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-danger" onclick="deletePaymentMethod(${method.id})">Διαγραφή</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading payment methods:', error);
    }
}

async function createPaymentMethod() {
    const name = document.getElementById('paymentName').value;
    const description = document.getElementById('paymentDescription').value;
    const cost = parseFloat(document.getElementById('paymentCost').value) || 0;

    if (!name) {
        alert('Εισάγετε όνομα');
        return;
    }

    const formData = new FormData();
    formData.append('action', 'create_payment');
    formData.append('name', name);
    formData.append('description', description);
    formData.append('cost', cost);

    try {
        const response = await fetch(getAdminApiUrl('/payment.php'), {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('Τρόπος πληρωμής δημιουργήθηκε');
            document.getElementById('paymentName').value = '';
            document.getElementById('paymentDescription').value = '';
            document.getElementById('paymentCost').value = '0';
            loadPaymentMethods();
        }
    } catch (error) {
        alert('Σφάλμα: ' + error.message);
    }
}

async function deletePaymentMethod(id) {
    if (confirm('Σίγουρα θέλετε να διαγράψετε αυτόν τον τρόπο πληρωμής;')) {
        const formData = new FormData();
        formData.append('action', 'delete_payment');
        formData.append('id', id);

        try {
            const response = await fetch(getAdminApiUrl('/payment.php'), {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                loadPaymentMethods();
                alert('Ο τρόπος πληρωμής διαγράφηκε με επιτυχία.');
            } else if (data.error) {
                alert('Σφάλμα: ' + data.error);
            }
        } catch (error) {
            console.error('Error deleting payment method:', error);
            alert('Σφάλμα κατά τη διαγραφή του τρόπου πληρωμής.');
        }
    }
}

async function loadSettings() {
    try {
        console.log('loadSettings() called');
        const formData = new FormData();
        formData.append('action', 'get_settings');

        console.log('Fetching settings from backend...');
        const response = await fetch(getAdminApiUrl('/settings.php'), {
            method: 'POST',
            body: formData
        });

        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const settings = await response.json();
        console.log('Settings received:', settings);

        if (settings.error) {
            console.error('Settings error:', settings.error);
            return;
        }

        console.log('Populating form fields...');
        document.getElementById('siteName').value = settings.site_name || '';
        document.getElementById('contactEmail').value = settings.contact_email || '';
        document.getElementById('contactPhone').value = settings.contact_phone || '';
        document.getElementById('footerText').value = settings.footer_text || '';
        document.getElementById('socialFacebook').value = settings.social_facebook || '';
        document.getElementById('socialInstagram').value = settings.social_instagram || '';
        document.getElementById('socialTwitter').value = settings.social_twitter || '';
        document.getElementById('socialYoutube').value = settings.social_youtube || '';
        console.log('Settings loaded and form populated');
    } catch (error) {
        console.error('Error loading settings:', error);
        alert('Σφάλμα κατά τη φόρτωση των ρυθμίσεων: ' + error.message);
    }
}

async function saveGeneralSettings() {
    const siteName = document.getElementById('siteName').value;
    const contactEmail = document.getElementById('contactEmail').value;
    const contactPhone = document.getElementById('contactPhone').value;
    const footerText = document.getElementById('footerText').value;

    console.log('Saving general settings:', { siteName, contactEmail, contactPhone, footerText });

    if (!siteName || !contactEmail) {
        alert('Παρακαλώ συμπληρώστε τα υποχρεωτικά πεδία');
        return;
    }

    const formData = new FormData();
    formData.append('action', 'update_settings');
    formData.append('site_name', siteName);
    formData.append('contact_email', contactEmail);
    formData.append('contact_phone', contactPhone);
    formData.append('footer_text', footerText);

    try {
        console.log('Sending POST request to settings.php...');
        const response = await fetch(getAdminApiUrl('/settings.php'), {
            method: 'POST',
            body: formData
        });

        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response data:', data);

        if (data.error) {
            alert('Σφάλμα: ' + data.error);
        } else if (data.success) {
            alert('✓ Ρυθμίσεις αποθηκεύτηκαν επιτυχώς');
            // Reload settings to verify
            await loadSettings();
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Σφάλμα: ' + error.message);
    }
}

async function saveSocialSettings() {
    const socialFacebook = document.getElementById('socialFacebook').value;
    const socialInstagram = document.getElementById('socialInstagram').value;
    const socialTwitter = document.getElementById('socialTwitter').value;
    const socialYoutube = document.getElementById('socialYoutube').value;

    console.log('Saving social settings:', { socialFacebook, socialInstagram, socialTwitter, socialYoutube });

    const formData = new FormData();
    formData.append('action', 'update_settings');
    formData.append('social_facebook', socialFacebook);
    formData.append('social_instagram', socialInstagram);
    formData.append('social_twitter', socialTwitter);
    formData.append('social_youtube', socialYoutube);

    try {
        console.log('Sending POST request to settings.php...');
        const response = await fetch(getAdminApiUrl('/settings.php'), {
            method: 'POST',
            body: formData
        });

        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response data:', data);

        if (data.error) {
            alert('Σφάλμα: ' + data.error);
        } else if (data.success) {
            alert('✓ Κοινωνικά δίκτυα ενημερώθηκαν');
            // Reload settings to verify
            await loadSettings();
        }
    } catch (error) {
        console.error('Error saving social settings:', error);
        alert('Σφάλμα: ' + error.message);
    }
}

async function changeUsername() {
    const newUsername = document.getElementById('newUsername').value;

    if (!newUsername) {
        alert('Εισάγετε νέο όνομα χρήστη');
        return;
    }

    const formData = new FormData();
    formData.append('action', 'change_username');
    formData.append('new_username', newUsername);

    try {
        const response = await fetch(getAdminApiUrl('/settings.php'), {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('Όνομα χρήστη ενημερώθηκε');
            localStorage.setItem('adminUsername', newUsername);
            document.getElementById('newUsername').value = '';
        }
    } catch (error) {
        alert('Σφάλμα: ' + error.message);
    }
}

async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    if (!currentPassword || !newPassword) {
        alert('Συμπληρώστε τους κωδικούς');
        return;
    }

    const formData = new FormData();
    formData.append('action', 'change_password');
    formData.append('current_password', currentPassword);
    formData.append('new_password', newPassword);

    try {
        const response = await fetch(getAdminApiUrl('/settings.php'), {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('Κωδικός αλλάχθηκε');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
        } else {
            alert('Σφάλμα: ' + data.error);
        }
    } catch (error) {
        alert('Σφάλμα: ' + error.message);
    }
}

function logout() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminUsername');
    location.reload();
}

function generateOrderPDF(orderId, orderCode) {
    try {
        const element = document.getElementById('orderModalContent');
        if (!element) {
            alert('Δεν βρέθηκε το περιεχόμενο της παραγγελίας');
            return;
        }

        // Clone the element to avoid modifying the original
        const clonedElement = element.cloneNode(true);
        
        // Remove any buttons from the PDF
        clonedElement.querySelectorAll('.btn').forEach(btn => btn.remove());
        clonedElement.querySelectorAll('button').forEach(btn => btn.remove());
        
        // Remove form inputs and keep only their labels/values for display
        clonedElement.querySelectorAll('select').forEach(select => {
            const selectedOption = select.options[select.selectedIndex];
            const text = document.createElement('div');
            text.textContent = selectedOption ? selectedOption.text : '';
            text.style.padding = '6px';
            text.style.border = '1px solid #ddd';
            text.style.fontSize = '12px';
            select.parentNode.replaceChild(text, select);
        });
        
        clonedElement.querySelectorAll('input[type="text"]').forEach(input => {
            const text = document.createElement('div');
            text.textContent = input.value || '-';
            text.style.padding = '6px';
            text.style.border = '1px solid #ddd';
            text.style.fontSize = '12px';
            input.parentNode.replaceChild(text, input);
        });
        
        clonedElement.querySelectorAll('textarea').forEach(textarea => {
            const text = document.createElement('div');
            text.textContent = textarea.value || '-';
            text.style.padding = '6px';
            text.style.border = '1px solid #ddd';
            text.style.whiteSpace = 'pre-wrap';
            text.style.wordBreak = 'break-word';
            text.style.fontSize = '12px';
            textarea.parentNode.replaceChild(text, textarea);
        });

        // Reduce all font sizes for more content to fit
        clonedElement.querySelectorAll('*').forEach(el => {
            const computed = window.getComputedStyle(el);
            const fontSize = parseFloat(computed.fontSize);
            if (fontSize > 12) {
                el.style.fontSize = '11px';
            }
        });

        const options = {
            margin: [8, 8, 8, 8],
            filename: `Order_${orderCode}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true, 
                allowTaint: true,
                letterRendering: true
            },
            jsPDF: { 
                orientation: 'portrait', 
                unit: 'mm', 
                format: 'a4',
                compress: true
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(options).from(clonedElement).save();
        alert('PDF δημιουργήθηκε και κατέβηκε με επιτυχία');
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Σφάλμα: ' + error.message);
    }
}

// Translations Management
async function loadTranslations() {
    try {
        const response = await fetch(getAdminApiUrl('/translations.php?action=get_all'));
        const data = await response.json();

        if (!data.success || !data.translations) {
            document.getElementById('translationsContainer').innerHTML = '<p>Δεν βρέθηκαν μεταφράσεις</p>';
            return;
        }

        const html = data.translations.map(trans => {
            return `
            <div class="translation-item">
                <div>
                    <label>Ελληνικά</label>
                    <div class="greek-text">${escapeHtml(trans.greek_text)}</div>
                </div>
                <div>
                    <label>Αγγλικά</label>
                    <input type="text" class="translation-input" data-id="${trans.id}" value="${escapeHtml(trans.english_text || '')}" placeholder="English translation">
                </div>
            </div>
            `;
        }).join('');

        document.getElementById('translationsContainer').innerHTML = html || '<p>Δεν βρέθηκαν μεταφράσεις</p>';
    } catch (error) {
        console.error('Error loading translations:', error);
        document.getElementById('translationsContainer').innerHTML = '<p>Σφάλμα: ' + error.message + '</p>';
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

async function saveAllTranslations() {
    const inputs = document.querySelectorAll('.translation-input');
    const translations = {};

    document.querySelectorAll('.translation-item').forEach((item, index) => {
        const greekText = item.querySelector('.greek-text').textContent.trim();
        const englishInput = item.querySelector('.translation-input');
        translations[greekText] = englishInput.value || '';
    });

    const formData = new FormData();
    formData.append('action', 'save_translations');
    formData.append('translations', JSON.stringify(translations));

    try {
        const response = await fetch(getAdminApiUrl('/translations.php'), {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('Μεταφράσεις αποθηκεύθηκαν με επιτυχία');
        } else {
            alert('Σφάλμα: ' + data.error);
        }
    } catch (error) {
        alert('Σφάλμα: ' + error.message);
    }
}

async function scanSiteTexts() {
    if (!confirm('Θέλετε να σαρώσετε την ιστοσελίδα για νέα κείμενα; Αυτό μπορεί να πάρει λίγο χρόνο...')) {
        return;
    }

    try {
        // Get the button element
        const scanButton = document.querySelector('button[onclick="scanSiteTexts()"]');
        const originalText = scanButton ? scanButton.textContent : 'Σάρωση';
        if (scanButton) {
            scanButton.textContent = 'Σάρωση σε εξέλιξη...';
            scanButton.disabled = true;
        }

        // List of HTML files to scan - relative to domain root
        const htmlFiles = [
            '/index.html',
            '/pages/about.html',
            '/pages/cart.html',
            '/pages/category.html',
            '/pages/checkout.html',
            '/pages/my-orders.html',
            '/pages/product.html',
            '/pages/search.html'
        ];

        const textsToAdd = new Set();
        
        // Greek alphabet pattern for detecting Greek text
        const greekPattern = /[\u0370-\u03FF\u1F00-\u1FFF]+/g;

        // Function to extract Greek text from HTML
        async function extractGreekFromFile(filePath) {
            try {
                // Build full URL with proper base path
                const fullUrl = window.location.origin + adminBasePath + filePath;
                console.log('Fetching:', fullUrl);
                
                const response = await fetch(fullUrl);
                if (!response.ok) {
                    console.warn(`Could not fetch ${filePath}: ${response.status}`);
                    return;
                }
                
                const html = await response.text();
                
                // Create a temporary container to parse HTML
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // Get all text nodes
                const walker = document.createTreeWalker(
                    doc.body || doc.documentElement,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );
                
                let node;
                while (node = walker.nextNode()) {
                    let text = node.textContent.trim();
                    
                    // Skip very short text and special characters only
                    if (text.length < 2) continue;
                    
                    // Skip if it contains only numbers, special chars, or URLs
                    if (/^[\d\s\.,;:\-\/\(\)\[\]\{\}@#$%^&*+=<>!?"|'`~\\]*$/.test(text)) continue;
                    
                    // Check if text contains Greek characters
                    if (greekPattern.test(text)) {
                        // Extract each Greek phrase/sentence
                        const phrases = text.split(/[\n\r]+/);
                        phrases.forEach(phrase => {
                            phrase = phrase.trim();
                            // Only add if it contains Greek and is long enough
                            if (phrase.length > 1 && greekPattern.test(phrase)) {
                                textsToAdd.add(phrase);
                            }
                        });
                    }
                }
            } catch (error) {
                console.warn(`Could not scan ${filePath}:`, error);
            }
        }

        // Scan all HTML files
        for (const file of htmlFiles) {
            await extractGreekFromFile(file);
        }

        // Also add these common UI terms that might not be in HTML
        const commonTerms = [
            'Αποθήκευση',
            'Διαγραφή',
            'Επεξεργασία',
            'Προβολή',
            'Αναζήτηση',
            'Φιλτράρισμα',
            'Ταξινόμηση',
            'Έξοδος',
            'Είσοδος',
            'Σφάλμα',
            'Επιτυχία',
            'Προειδοποίηση',
            'Φόρτωση...',
            'Ναι',
            'Όχι',
            'Ακύρωση',
            'Συνέχεια',
            'Λήψη',
            'Ανέβασμα'
        ];
        
        commonTerms.forEach(term => textsToAdd.add(term));

        // Convert Set to Array for sending
        const textsArray = Array.from(textsToAdd).sort();

        if (scanButton) {
            scanButton.textContent = originalText;
            scanButton.disabled = false;
        }

        if (textsArray.length === 0) {
            alert('Δεν βρέθηκε κανένα νέο κείμενο για σάρωση.');
            return;
        }

        // Send to backend
        const formData = new FormData();
        formData.append('action', 'add_missing');
        formData.append('texts', JSON.stringify(textsArray));

        const response = await fetch(getAdminApiUrl('/translations.php'), {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert(`Σάρωση ολοκληρώθηκε! Βρέθηκαν ${textsArray.length} κείμενα.\n${data.message}`);
            loadTranslations();
        } else {
            alert('Σφάλμα: ' + data.error);
        }
    } catch (error) {
        console.error('Scan error:', error);
        alert('Σφάλμα: ' + error.message);
    }
}

async function exportUntranslatedJSON() {
    try {
        const response = await fetch(getAdminApiUrl('/translations.php?action=export_untranslated'), {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error('Failed to export');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translations_empty_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        alert('Ληφθείσα λίστα κενών μεταφράσεων!');
    } catch (error) {
        alert('Σφάλμα: ' + error.message);
    }
}

async function exportAllTranslationsJSON() {
    try {
        const response = await fetch(getAdminApiUrl('/translations.php?action=export_all'), {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error('Failed to export');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translations_all_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        alert('Ληφθείσα λίστα όλων των μεταφράσεων!');
    } catch (error) {
        alert('Σφάλμα: ' + error.message);
    }
}

function handleImportTranslationsFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('Θέλετε να εισάγετε τις μεταφράσεις από το αρχείο;')) {
        event.target.value = '';
        return;
    }
    
    const formData = new FormData();
    formData.append('action', 'import_json');
    formData.append('file', file);
    
    fetch(getAdminApiUrl('/translations.php'), {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            loadTranslations();
        } else {
            alert('Σφάλμα: ' + data.error);
        }
    })
    .catch(error => {
        alert('Σφάλμα: ' + error.message);
    })
    .finally(() => {
        event.target.value = '';
    });
}

window.onclick = function(event) {
    const modal = document.getElementById('orderModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};
// === CATEGORIES PAGE ===

async function loadCategories() {
    try {
        // Initialize table first
        await fetch(getAdminApiUrl('/categories.php'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'action=init_table'
        });
        
        // Load categories
        const response = await fetch(getAdminApiUrl('/categories.php?action=get_categories'));
        const categories = await response.json();
        
        const container = document.getElementById('categoriesList');
        container.innerHTML = '';
        
        categories.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'category-item';
            item.style.cssText = 'display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #eee;';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'cat_' + cat.cat_id;
            checkbox.checked = cat.visible;
            checkbox.style.cssText = 'width: 18px; height: 18px; margin-right: 12px; cursor: pointer;';
            
            const label = document.createElement('label');
            label.htmlFor = 'cat_' + cat.cat_id;
            label.textContent = cat.category;
            label.style.cssText = 'cursor: pointer; flex: 1; font-size: 14px;';
            
            item.appendChild(checkbox);
            item.appendChild(label);
            container.appendChild(item);
        });
        
    } catch (error) {
        console.error('Error loading categories:', error);
        alert('Σφάλμα: ' + error.message);
    }
}

async function saveCategoryVisibility() {
    try {
        const checkboxes = document.querySelectorAll('#categoriesList input[type="checkbox"]');
        const visibility = [];
        
        checkboxes.forEach(checkbox => {
            const catId = checkbox.id.replace('cat_', '');
            const label = document.querySelector(`label[for="${checkbox.id}"]`);
            
            visibility.push({
                cat_id: catId,
                category: label.textContent,
                visible: checkbox.checked
            });
        });
        
        const formData = new FormData();
        formData.append('action', 'save_visibility');
        formData.append('visibility', JSON.stringify(visibility));
        
        const response = await fetch(getAdminApiUrl('/categories.php'), {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς!');
        } else {
            alert('Σφάλμα: ' + data.error);
        }
    } catch (error) {
        console.error('Error saving categories:', error);
        alert('Σφάλμα: ' + error.message);
    }
}

// ============ PRODUCT MANAGEMENT FUNCTIONS ============

function initProductForm() {
    const productForm = document.getElementById('productForm');
    if (productForm && !productForm.dataset.initialized) {
        productForm.addEventListener('submit', handleProductFormSubmit);
        
        const categoryInput = document.getElementById('productCategory');
        if (categoryInput) {
            categoryInput.addEventListener('change', (e) => {
                if (e.target.value) {
                    document.getElementById('productCatId').value = e.target.value;
                    // Set category name from selected option
                    const selectedOption = e.target.options[e.target.selectedIndex];
                    if (selectedOption) {
                        document.getElementById('productName').placeholder = 'π.χ. ' + selectedOption.text;
                    }
                }
            });
        }
        
        productForm.dataset.initialized = 'true';
        console.log('Product form initialized');
    }
}

function initCategoryForm() {
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm && !categoryForm.dataset.initialized) {
        const categoryName = document.getElementById('categoryName');
        const categorySlug = document.getElementById('categorySlug');
        
        if (categoryName && categorySlug) {
            categoryName.addEventListener('input', (e) => {
                // Convert Greek and other unicode to ASCII-friendly slug
                let slug = e.target.value.toLowerCase();
                
                // Greek character mapping
                const greekMap = {
                    'α': 'a', 'β': 'b', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'h', 'θ': 'th',
                    'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x', 'ο': 'o', 'π': 'p',
                    'ρ': 'r', 'σ': 's', 'ς': 's', 'τ': 't', 'υ': 'y', 'φ': 'f', 'χ': 'ch', 'ψ': 'ps', 'ω': 'o',
                    'ά': 'a', 'έ': 'e', 'ή': 'h', 'ί': 'i', 'ό': 'o', 'ύ': 'y', 'ώ': 'o'
                };
                
                // Replace Greek characters
                for (let greek in greekMap) {
                    slug = slug.replace(new RegExp(greek, 'g'), greekMap[greek]);
                }
                
                // Remove non-alphanumeric characters and convert to slug format
                slug = slug.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                categorySlug.value = slug;
            });
        }
        
        categoryForm.addEventListener('submit', handleCategoryFormSubmit);
        categoryForm.dataset.initialized = 'true';
        console.log('Category form initialized');
    }
    
    // Load parent categories for dropdown
    loadParentCategoriesForDropdown();
}

async function loadProductCategories() {
    try {
        // Get categories with visibility status from products table
        const response = await fetch(getAdminApiUrl('/categories.php?action=get_categories'));
        const categories = await response.json();
        
        console.log('Categories with visibility:', categories);
        
        const select = document.getElementById('productCategory');
        if (select) {
            select.innerHTML = '<option value="">-- Επιλέξτε κατηγορία --</option>';
            
            // Filter to show only visible categories
            if (Array.isArray(categories)) {
                categories.forEach(cat => {
                    if (cat.visible === true || cat.visible === 1) {
                        const option = document.createElement('option');
                        option.value = cat.cat_id;
                        option.textContent = cat.category;
                        select.appendChild(option);
                    }
                });
                console.log('Loaded visible product categories');
            }
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function handleProductFormSubmit(event) {
    event.preventDefault();
    
    const statusDiv = document.getElementById('productFormStatus');
    statusDiv.style.display = 'block';
    
    const form = event.target;
    const editingId = form.dataset.editingId;
    const isUpdate = editingId ? true : false;
    
    statusDiv.innerHTML = '<p style="color: #2196F3;">' + (isUpdate ? 'Ενημέρωση...' : 'Ανέβασμα...') + '</p>';
    
    try {
        const formData = new FormData(event.target);
        
        // If editing, add the update method and ID
        if (isUpdate) {
            formData.append('_method', 'PUT');
            formData.append('id', editingId);
        }
        
        // Add category info from selected option
        const categorySelect = document.getElementById('productCategory');
        if (categorySelect) {
            const selectedValue = categorySelect.value;
            
            if (selectedValue) {
                const selectedOption = categorySelect.options[categorySelect.selectedIndex];
                let catId = String(selectedValue).trim();
                
                console.log('Raw catId:', catId);
                
                // If it's a custom category (starts with 'custom_'), extract just the numeric ID
                if (catId.startsWith('custom_')) {
                    catId = catId.substring(7); // Remove 'custom_' prefix (7 characters)
                    console.log('Extracted custom catId:', catId);
                }
                
                formData.set('cat_id', catId);
                formData.set('category', selectedOption.text);
            } else {
                // No category selected - explicitly set to null
                formData.set('cat_id', '');
                formData.set('category', '');
            }
        }
        
        const response = await fetch(getAdminApiUrl('/products-crud.php'), {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            const message = isUpdate ? 'Προϊόν ενημερώθηκε με επιτυχία!' : 'Προϊόν δημιουργήθηκε με επιτυχία!';
            statusDiv.innerHTML = '<p style="color: #4CAF50;">' + message + '</p>';
            event.target.reset();
            
            // Clear editing mode
            form.dataset.editingId = '';
            const submitBtn = document.querySelector('#productForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Ανέβασμα Προϊόντος';
            }
            
            // Hide cancel button
            const cancelBtn = document.getElementById('cancelEditBtn');
            if (cancelBtn) {
                cancelBtn.style.display = 'none';
            }
            
            loadProductCategories();
            loadProducts();
            
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        } else {
            statusDiv.innerHTML = '<p style="color: #f44336;">Σφάλμα: ' + result.error + '</p>';
        }
    } catch (error) {
        console.error('Error:', error);
        statusDiv.innerHTML = '<p style="color: #f44336;">Σφάλμα: ' + error.message + '</p>';
    }
}

// ============ CATEGORY MANAGEMENT FUNCTIONS ============

async function handleCategoryFormSubmit(event) {
    event.preventDefault();
    
    const statusDiv = document.getElementById('categoryFormStatus');
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = '<p style="color: #2196F3;">Δημιουργία...</p>';
    
    try {
        const formData = new FormData(event.target);
        formData.append('action', 'create');
        
        const response = await fetch(getAdminApiUrl('/categories.php'), {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            statusDiv.innerHTML = '<p style="color: #4CAF50;">Η κατηγορία δημιουργήθηκε επιτυχώς!</p>';
            event.target.reset();
            loadCustomCategories();
            loadProductCategories();
            loadParentCategoriesForDropdown();
            
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        } else {
            statusDiv.innerHTML = '<p style="color: #f44336;">Σφάλμα: ' + result.error + '</p>';
        }
    } catch (error) {
        console.error('Error:', error);
        statusDiv.innerHTML = '<p style="color: #f44336;">Σφάλμα: ' + error.message + '</p>';
    }
}

async function loadParentCategoriesForDropdown() {
    try {
        // Fetch custom categories
        const customResponse = await fetch(getAdminApiUrl('/categories.php?action=list'));
        const customData = await customResponse.json();
        
        // Fetch product categories (imported from XML)
        const productsResponse = await fetch(getAdminApiUrl('/categories.php?action=get_categories'));
        const productCategories = await productsResponse.json();
        
        const select = document.getElementById('categoryParent');
        if (select) {
            // Keep the default option
            const defaultOption = select.querySelector('option');
            select.innerHTML = '';
            select.appendChild(defaultOption);
            
            // Add custom categories
            if (customData.success) {
                const customCatsGroup = document.createElement('optgroup');
                customCatsGroup.label = 'Προσαρμοσμένες Κατηγορίες';
                
                customData.data.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.parent_name ? cat.name + ' (υποκατηγορία του ' + cat.parent_name + ')' : cat.name;
                    customCatsGroup.appendChild(option);
                });
                
                select.appendChild(customCatsGroup);
            }
            
            // Add imported product categories - deduplicate and merge similar names
            if (Array.isArray(productCategories) && productCategories.length > 0) {
                const importedCatsGroup = document.createElement('optgroup');
                importedCatsGroup.label = 'Κατηγορίες Εισαγωγής';
                
                // Deduplicate: only show top-level categories (without » or >)
                const uniqueCategories = new Map();
                
                productCategories.forEach(cat => {
                    let categoryName = cat.category;
                    
                    // Extract only the first level category (before » or >)
                    if (categoryName.includes(' » ')) {
                        categoryName = categoryName.split(' » ')[0].trim();
                    } else if (categoryName.includes(' > ')) {
                        categoryName = categoryName.split(' > ')[0].trim();
                    }
                    
                    // Normalize similar names - merge Προιοντα and Προϊόντα
                    if (categoryName === 'Προιοντα' || categoryName === 'Προϊόντα') {
                        categoryName = 'Προϊόντα';
                    }
                    
                    // Only add if not already added
                    if (!uniqueCategories.has(categoryName)) {
                        uniqueCategories.set(categoryName, cat.cat_id);
                    }
                });
                
                // Sort and add to dropdown
                const sortedCategories = Array.from(uniqueCategories.entries()).sort();
                sortedCategories.forEach(([name, catId]) => {
                    const option = document.createElement('option');
                    option.value = 'imported_' + catId;
                    option.textContent = name;
                    importedCatsGroup.appendChild(option);
                });
                
                select.appendChild(importedCatsGroup);
            }
        }
    } catch (error) {
        console.error('Error loading parent categories:', error);
    }
}

async function loadCustomCategories() {
    try {
        const response = await fetch(getAdminApiUrl('/categories.php?action=list'));
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('customCategoriesList');
            
            if (!data.data || data.data.length === 0) {
                container.innerHTML = '<p style="color: #999; text-align: center; padding: 30px;">Δεν υπάρχουν κατηγορίες ακόμα</p>';
                return;
            }
            
            container.innerHTML = '';
            data.data.forEach(cat => {
                const item = document.createElement('div');
                const isSubcategory = cat.parent_id !== null && cat.parent_id !== undefined;
                const paddingLeft = isSubcategory ? '30px' : '0px';
                
                item.style.cssText = `display: flex; align-items: center; justify-content: space-between; padding: 12px; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 8px; margin-left: ${paddingLeft}; background-color: ${isSubcategory ? '#f5f5f5' : '#fff'};`;
                
                const info = document.createElement('div');
                info.style.cssText = 'flex: 1;';
                const subcategoryBadge = isSubcategory ? `<span style="background-color: #2196F3; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-right: 8px;">υποκατηγορία του ${cat.parent_name}</span>` : '';
                info.innerHTML = `${subcategoryBadge}<strong>${cat.name}</strong><br><small style="color: #999;">${cat.description || ''}</small>`;
                
                const actions = document.createElement('div');
                actions.style.cssText = 'display: flex; gap: 8px;';
                actions.innerHTML = `<button class="btn btn-secondary" onclick="editCategory(${cat.id})">Επεξεργασία</button><button class="btn btn-danger" onclick="deleteCategory(${cat.id})">Διαγραφή</button>`;
                
                item.appendChild(info);
                item.appendChild(actions);
                container.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function editCategory(id) {
    // Fetch current category data
    try {
        const response = await fetch(getAdminApiUrl('/categories.php?action=list'));
        const data = await response.json();
        
        const category = data.data.find(cat => cat.id === id);
        if (!category) {
            alert('Η κατηγορία δεν βρέθηκε');
            return;
        }
        
        // Create a modal-like dialog for editing
        const newName = prompt('Όνομα κατηγορίας:', category.name);
        if (!newName) return;
        
        const newDescription = prompt('Περιγραφή:', category.description || '');
        
        // Build parent category choices
        let parentId = category.parent_id || '';
        const otherCategories = data.data.filter(cat => cat.id !== id);
        
        let parentChoice = prompt(
            'Επιλέξτε γονική κατηγορία (αφήστε κενό για κύρια κατηγορία):\n\n' + 
            otherCategories.map(cat => `${cat.id}: ${cat.name}`).join('\n'),
            parentId ? String(parentId) : ''
        );
        
        if (parentChoice === null) return; // User cancelled
        parentId = parentChoice ? parseInt(parentChoice) : null;
        
        // Validate parent_id is not the same as id
        if (parentId === id) {
            alert('Μια κατηγορία δεν μπορεί να είναι η δική της γονική κατηγορία');
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('action', 'update');
            formData.append('id', id);
            formData.append('name', newName);
            formData.append('description', newDescription);
            if (parentId) {
                formData.append('parent_id', parentId);
            }
            
            const updateResponse = await fetch(getAdminApiUrl('/categories.php'), {
                method: 'POST',
                body: formData
            });
            
            const result = await updateResponse.json();
            
            if (result.success) {
                loadCustomCategories();
                loadProductCategories();
                loadParentCategoriesForDropdown();
            } else {
                alert('Σφάλμα: ' + result.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Σφάλμα: ' + error.message);
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
        alert('Σφάλμα: ' + error.message);
    }
}

async function deleteCategory(id) {
    if (!confirm('Είστε σίγουρος ότι θέλετε να διαγράψετε αυτή την κατηγορία;')) return;
    
    try {
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('id', id);
        
        const response = await fetch(getAdminApiUrl('/categories.php'), {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadCustomCategories();
            loadProductCategories();
            loadParentCategoriesForDropdown();
        } else {
            alert('Σφάλμα: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Σφάλμα: ' + error.message);
    }
}

// Featured Products Functions
let allProducts = [];
let selectedFeaturedProducts = [];

async function loadFeaturedProductsUI() {
    try {
        // Load all products for selection - no limit, load all pages
        let allLoadedProducts = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
            const response = await fetch(getApiUrl(`/products.php?action=get_products&page=${page}&limit=100`));
            const data = await response.json();
            
            if (data.products && data.products.length > 0) {
                allLoadedProducts = allLoadedProducts.concat(data.products);
                page++;
                hasMore = data.products.length === 100;
            } else {
                hasMore = false;
            }
        }
        
        allProducts = allLoadedProducts;
        
        // Load currently selected featured products
        try {
            const selectedResponse = await fetch(getAdminApiUrl('/settings.php?action=get_featured_products'));
            const selectedData = await selectedResponse.json();
            selectedFeaturedProducts = Array.isArray(selectedData) ? selectedData : [];
        } catch (e) {
            console.warn('Could not load featured products (table may not exist yet)');
            selectedFeaturedProducts = [];
        }
        
        renderAvailableProducts();
        renderSelectedProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        alert('Σφάλμα φόρτωσης προϊόντων: ' + error.message);
    }
}

function renderAvailableProducts(searchTerm = '') {
    const list = document.getElementById('availableProductsList');
    const filtered = allProducts.filter(p => {
        const matchesSearch = searchTerm === '' || p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const isNotSelected = !selectedFeaturedProducts.some(sp => sp.product_id === p.id);
        return matchesSearch && isNotSelected;
    });

    list.innerHTML = filtered.map(product => `
        <div style="padding: 8px; border-bottom: 1px solid #ddd; cursor: pointer; hover {background: #e9e9e9;};" 
             onclick="addFeaturedProduct(${product.id}, '${product.name.replace(/'/g, "\\'")}', '${product.image || ''}')">
            <strong>${product.name}</strong>
            <small style="display: block; color: #666;">ID: ${product.id}</small>
        </div>
    `).join('');
}

function renderSelectedProducts() {
    const list = document.getElementById('selectedProductsList');
    
    if (selectedFeaturedProducts.length === 0) {
        list.innerHTML = '<p style="color: #999;">Δεν έχουν επιλεγεί προϊόντα</p>';
        return;
    }

    list.innerHTML = selectedFeaturedProducts.map((product, index) => `
        <div style="padding: 10px; background: white; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                ${product.image ? `<img src="${product.image}" style="max-height: 50px; max-width: 50px; object-fit: cover; border-radius: 4px;">` : ''}
                <div>
                    <strong>${product.name}</strong>
                    <small style="display: block; color: #666;">ID: ${product.product_id}</small>
                </div>
            </div>
            <button type="button" class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;" onclick="removeFeaturedProduct(${product.product_id})">Αφαίρεση</button>
        </div>
    `).join('');
}

function addFeaturedProduct(productId, productName, productImage) {
    if (selectedFeaturedProducts.length >= 10) {
        alert('Μέχρι 10 προϊόντα μπορούν να επιλεγούν');
        return;
    }

    selectedFeaturedProducts.push({
        product_id: productId,
        name: productName,
        image: productImage
    });

    document.getElementById('featuredProductsSearch').value = '';
    renderAvailableProducts();
    renderSelectedProducts();
}

function removeFeaturedProduct(productId) {
    selectedFeaturedProducts = selectedFeaturedProducts.filter(p => p.product_id !== productId);
    renderAvailableProducts();
    renderSelectedProducts();
}

async function saveFeaturedProducts() {
    const productIds = selectedFeaturedProducts.map(p => p.product_id);

    const formData = new FormData();
    formData.append('action', 'save_featured_products');
    formData.append('product_ids', JSON.stringify(productIds));

    try {
        const response = await fetch(getAdminApiUrl('/settings.php'), {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('Προϊόντα αποθηκεύτηκαν');
            await loadFeaturedProductsUI();
        } else {
            alert('Σφάλμα: ' + (data.error || 'Αγνωστο σφάλμα'));
        }
    } catch (error) {
        alert('Σφάλμα: ' + error.message);
    }
}

// Add search listener for featured products
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('featuredProductsSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderAvailableProducts(e.target.value);
        });
    }
});
