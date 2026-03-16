// Featured Products Carousel - Simple Show/Hide Method
let currentCarouselIndex = 0;
let carouselProducts = [];
let itemsPerView = 3;

async function loadFeaturedProducts() {
    const carouselSection = document.getElementById('featuredCarouselSection');
    const carouselItems = document.getElementById('carouselItems');
    
    if (!carouselSection || !carouselItems) return;

    try {
        const response = await fetch(getAdminUrl('/settings.php?action=get_featured_products'));
        
        if (!response.ok) {
            console.warn('Featured products API returned error:', response.status);
            carouselSection.style.display = 'none';
            return;
        }

        const products = await response.json();
        
        if (!products || !Array.isArray(products) || products.length === 0) {
            carouselSection.style.display = 'none';
            return;
        }

        carouselProducts = products;
        carouselSection.style.display = 'block';
        
        // Update items per view based on screen size
        updateItemsPerView();
        
        // Render carousel items
        carouselItems.innerHTML = products.map((product, index) => `
            <div class="carousel-item" data-index="${index}">
                <a href="pages/product.html?id=${product.product_id}" style="text-decoration: none; color: inherit; display: block; height: 100%;">
                    <img src="${product.image || 'assets/images/placeholder.png'}" alt="${product.name}" class="carousel-item-image" onerror="this.src='assets/images/placeholder.png'">
                    <div class="carousel-item-content">
                        <div class="carousel-item-name">${product.name}</div>
                        <div class="carousel-item-price">€${parseFloat(product.price_with_vat || 0).toFixed(2)}</div>
                    </div>
                </a>
            </div>
        `).join('');

        // Setup carousel controls
        setupCarouselControls();
        
        // Show initial items
        updateCarouselView();
    } catch (error) {
        console.warn('Error loading featured products:', error);
        carouselSection.style.display = 'none';
    }
}

function updateItemsPerView() {
    itemsPerView = window.innerWidth <= 768 ? 1 : 3;
}

function updateCarouselView() {
    const items = document.querySelectorAll('.carousel-item');
    
    // Hide all items
    items.forEach(item => {
        item.style.display = 'none';
    });
    
    // Show current items based on itemsPerView
    for (let i = 0; i < itemsPerView && (currentCarouselIndex + i) < items.length; i++) {
        items[currentCarouselIndex + i].style.display = 'block';
    }
}

function setupCarouselControls() {
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');

    if (prevBtn) {
        prevBtn.onclick = () => slideCarousel(-1);
    }
    if (nextBtn) {
        nextBtn.onclick = () => slideCarousel(1);
    }
}

function slideCarousel(direction) {
    const items = document.querySelectorAll('.carousel-item');
    const maxIndex = Math.max(0, items.length - itemsPerView);

    currentCarouselIndex += direction;
    
    if (currentCarouselIndex < 0) {
        currentCarouselIndex = maxIndex;
    } else if (currentCarouselIndex > maxIndex) {
        currentCarouselIndex = 0;
    }

    updateCarouselView();
}

// Load featured products when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFeaturedProducts);
} else {
    loadFeaturedProducts();
}

// Handle window resize
window.addEventListener('resize', () => {
    const oldItemsPerView = itemsPerView;
    updateItemsPerView();
    
    if (oldItemsPerView !== itemsPerView) {
        currentCarouselIndex = 0;
        updateCarouselView();
    }
});
