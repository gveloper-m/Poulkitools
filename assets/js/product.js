// Product detail page functionality

let currentProductId = null;
let productGalleryImages = [];
let currentGalleryIndex = 0;

document.addEventListener('DOMContentLoaded', async function() {
    const params = new URLSearchParams(window.location.search);
    currentProductId = params.get('id');

    if (currentProductId) {
        await loadProduct(currentProductId);
        await loadRecommendedProducts();
    }
});

async function loadProduct(id) {
    try {
        const response = await fetch(`${API_BASE}/products.php?action=get_product&id=${id}`);
        const product = await response.json();

        if (product.error) {
            document.getElementById('productDetail').innerHTML = '<p>Το προϊόν δεν βρέθηκε</p>';
            return;
        }

        const price = product.thursday_price > 0 ? product.thursday_price : product.price_with_vat;
        const oldPrice = product.thursday_price > 0 ? product.price_with_vat : null;
        const inStock = product.instock === 'Y' || product.instock === 'Yes';
        productGalleryImages = [
            product.image,
            ...(Array.isArray(product.extra_images) ? product.extra_images : [])
        ].filter(Boolean).map(fixImagePath);
        currentGalleryIndex = 0;

        BreadcrumbManager.setBreadcrumb(BreadcrumbManager.createFromProduct(product));

        const thumbnailsHtml = productGalleryImages.length > 1 ? `
            <div class="product-thumbnail-gallery">
                ${productGalleryImages.map((img, index) => `
                    <img
                        src="${img}"
                        alt="${product.name} ${index + 1}"
                        class="product-thumbnail ${index === currentGalleryIndex ? 'active' : ''}"
                        onclick="changeMainImage(${index})"
                    >
                `).join('')}
            </div>
        ` : '';

        const galleryNavigationHtml = productGalleryImages.length > 1 ? `
            <button type="button" class="product-gallery-arrow left" aria-label="Προηγούμενη εικόνα" onclick="changeGalleryImage(-1)">
                &#10094;
            </button>
            <button type="button" class="product-gallery-arrow right" aria-label="Επόμενη εικόνα" onclick="changeGalleryImage(1)">
                &#10095;
            </button>
        ` : '';

        const mainImage = productGalleryImages[0] || fixImagePath(product.image);
        const categoryName = (product.category || '').split('>').pop().trim() || 'N/A';

        const productHTML = `
            <div class="product-gallery">
                <div class="product-main-image-wrapper">
                    <img src="${mainImage}" alt="${product.name}" class="product-main-image" id="mainImage">
                    ${galleryNavigationHtml}
                </div>
                ${thumbnailsHtml}
            </div>

            <div class="product-details-content">
                <h1>${product.name}</h1>

                <div class="product-meta">
                    <div class="meta-item">
                        <span class="meta-label">Κατηγορία:</span>
                        <span class="meta-value">${categoryName}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Κατασκευαστής:</span>
                        <span class="meta-value">${product.manufacturer || 'N/A'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Μοντέλο:</span>
                        <span class="meta-value">${product.model || 'N/A'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Κωδικός Προϊόντος:</span>
                        <span class="meta-value">${product.mpa || 'N/A'}</span>
                    </div>
                    ${product.weight ? `
                    <div class="meta-item">
                        <span class="meta-label">Βάρος:</span>
                        <span class="meta-value">${product.weight}</span>
                    </div>
                    ` : ''}
                    ${product.gan ? `
                    <div class="meta-item">
                        <span class="meta-label">Barcode:</span>
                        <span class="meta-value">${product.gan}</span>
                    </div>
                    ` : ''}
                </div>

                <div class="product-price">
                    <span class="price">${formatPrice(price)}</span>
                    ${oldPrice ? `<span class="old-price">${formatPrice(oldPrice)}</span><span class="sale-badge">ΠΡΟΣΦΟΡΑ</span>` : ''}
                </div>

                <div class="availability ${inStock ? 'in-stock' : 'out-of-stock'}">
                    ${product.availability || (inStock ? 'Διαθέσιμο' : 'Εξαντλημένο')}
                </div>

                ${product.description ? `<div class="product-description">${product.description}</div>` : ''}

                ${inStock ? `
                    <div class="quantity-selector">
                        <label class="quantity-label">Ποσότητα:</label>
                        <input type="number" id="quantityInput" class="quantity-input" value="1" min="1" max="${product.quantity}">
                    </div>
                    <button class="btn btn-primary add-to-cart-btn" onclick="addToCartFromDetail()">Προσθήκη στο Καλάθι</button>
                ` : `
                    <button class="btn btn-secondary add-to-cart-btn" disabled>Εξαντλημένο</button>
                `}
            </div>
        `;

        document.getElementById('productDetail').innerHTML = productHTML;
        updateGalleryView();
    } catch (error) {
        console.error('Error loading product:', error);
        document.getElementById('productDetail').innerHTML = '<p>Σφάλμα κατά τη φόρτωση του προϊόντος</p>';
    }
}

async function loadRecommendedProducts() {
    try {
        const response = await fetch(`${API_BASE}/products.php?action=get_products&page=1&limit=5`);
        const data = await response.json();

        const recommendedGrid = document.getElementById('recommendedGrid');
        if (recommendedGrid && data.products.length > 0) {
            recommendedGrid.innerHTML = data.products.slice(0, 5).map(product => createProductCard(product)).join('');
        }
    } catch (error) {
        console.error('Error loading recommended products:', error);
    }
}

function updateGalleryView() {
    const mainImage = document.getElementById('mainImage');
    if (mainImage && productGalleryImages[currentGalleryIndex]) {
        mainImage.src = productGalleryImages[currentGalleryIndex];
    }

    document.querySelectorAll('.product-thumbnail').forEach((thumb, index) => {
        thumb.classList.toggle('active', index === currentGalleryIndex);
    });
}

function changeMainImage(index) {
    currentGalleryIndex = index;
    updateGalleryView();
}

function changeGalleryImage(step) {
    if (productGalleryImages.length < 2) {
        return;
    }

    currentGalleryIndex = (currentGalleryIndex + step + productGalleryImages.length) % productGalleryImages.length;
    updateGalleryView();
}

function addToCartFromDetail() {
    const quantity = parseInt(document.getElementById('quantityInput').value);
    if (quantity < 1) {
        showNotification('Έγκυρη ποσότητα απαιτείται', 'error');
        return;
    }
    addToCart({ stopPropagation: () => {} }, currentProductId, quantity);
}
