// Category page functionality

let currentCategoryId = null;
let currentCategoryFilter = null;
let allProducts = [];
let currentSort = '';

function handlePriceFilterChange(value) {
    currentSort = value;
    console.log('Sort changed to:', value);
    displayProducts();
}

document.addEventListener('DOMContentLoaded', async function() {
    const params = new URLSearchParams(window.location.search);
    currentCategoryId = params.get('id');
    currentCategoryFilter = params.get('filter');

    if (currentCategoryId) {
        await loadCategoryProducts();
    }
});

async function loadCategoryProducts(page = 1) {
    try {
        const response = await fetch(`${API_BASE}/products.php?action=get_products&category=${currentCategoryId}&page=${page}&limit=20`);
        const data = await response.json();

        // Filter by category level if filter parameter provided
        let filteredProducts = data.products;
        if (currentCategoryFilter) {
            filteredProducts = data.products.filter(p => 
                p.category.toLowerCase().includes(currentCategoryFilter.toLowerCase())
            );
        }

        // Store all products for sorting
        allProducts = filteredProducts;
        console.log('Products loaded:', allProducts.length, 'Current sort:', currentSort);

        const categoryDisplayName = filteredProducts.length > 0 ? filteredProducts[0].category : 'Κατηγορία';
        
        // Safely update DOM elements if they exist
        const categoryNameEl = document.getElementById('categoryName');
        if (categoryNameEl) {
            categoryNameEl.textContent = categoryDisplayName;
        }
        
        const categoryTitleEl = document.getElementById('categoryTitle');
        if (categoryTitleEl) {
            categoryTitleEl.textContent = categoryDisplayName;
        }

        // Set up breadcrumbs using BreadcrumbManager
        BreadcrumbManager.setBreadcrumb(BreadcrumbManager.createFromCategory(categoryDisplayName, currentCategoryId));

        // Display products with current sort preserved
        displayProducts();
        createCategoryPagination(Math.ceil(filteredProducts.length / 20), page);
    } catch (error) {
        console.error('Error loading category products:', error);
    }
}

function displayProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    let productsToDisplay = [...allProducts];

    // Apply sorting if selected
    if (currentSort === 'asc' || currentSort === 'desc') {
        productsToDisplay.sort((a, b) => {
            // Use the same price logic as createProductCard
            const priceA = a.thursday_price > 0 ? parseFloat((a.thursday_price || '0').toString().replace(',', '.')) : parseFloat((a.price_with_vat || '0').toString().replace(',', '.'));
            const priceB = b.thursday_price > 0 ? parseFloat((b.thursday_price || '0').toString().replace(',', '.')) : parseFloat((b.price_with_vat || '0').toString().replace(',', '.'));
            
            return currentSort === 'asc' ? priceA - priceB : priceB - priceA;
        });
    }

    if (productsToDisplay.length > 0) {
        productsGrid.innerHTML = productsToDisplay.map(product => createProductCard(product)).join('');
    } else {
        productsGrid.innerHTML = '<p class="text-center">Δεν υπάρχουν προϊόντα σε αυτή την κατηγορία</p>';
    }
}

function createCategoryPagination(pages, currentPage) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer || pages <= 1) return;

    let html = '';

    if (currentPage > 1) {
        html += `<a href="#" onclick="event.preventDefault(); loadCategoryProducts(${currentPage - 1})">Προηγούμενη</a>`;
    }

    for (let i = Math.max(1, currentPage - 2); i <= Math.min(pages, currentPage + 2); i++) {
        if (i === currentPage) {
            html += `<span class="active">${i}</span>`;
        } else {
            html += `<a href="#" onclick="event.preventDefault(); loadCategoryProducts(${i})">${i}</a>`;
        }
    }

    if (currentPage < pages) {
        html += `<a href="#" onclick="event.preventDefault(); loadCategoryProducts(${currentPage + 1})">Επόμενη</a>`;
    }

    paginationContainer.innerHTML = html;
}
