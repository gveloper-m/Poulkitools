// Search results page functionality

let searchQuery = '';

document.addEventListener('DOMContentLoaded', async function() {
    const params = new URLSearchParams(window.location.search);
    searchQuery = params.get('q') || '';

    if (searchQuery) {
        document.getElementById('searchTitle').textContent = `Αποτελέσματα για: ${searchQuery}`;
        document.getElementById('searchInput').value = searchQuery;
        
        // Set up breadcrumbs using BreadcrumbManager
        BreadcrumbManager.setBreadcrumb(BreadcrumbManager.createFromSearchResults(searchQuery));
        
        await searchProducts();
    }
});

async function searchProducts(page = 1) {
    if (!searchQuery) return;

    try {
        const response = await fetch(`${API_BASE}/products.php?action=get_products&search=${encodeURIComponent(searchQuery)}&page=${page}&limit=20`);
        const data = await response.json();

        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) {
            if (data.products.length > 0) {
                productsGrid.innerHTML = data.products.map(product => createProductCard(product)).join('');
            } else {
                productsGrid.innerHTML = '<p class="text-center">Δεν βρέθηκαν προϊόντα που να ταιριάζουν στην αναζήτησή σας</p>';
            }
        }

        createSearchPagination(data.pages, page);
    } catch (error) {
        console.error('Error searching products:', error);
    }
}

function createSearchPagination(pages, currentPage) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer || pages <= 1) return;

    let html = '';

    if (currentPage > 1) {
        html += `<a href="#" onclick="event.preventDefault(); searchProducts(${currentPage - 1})">Προηγούμενη</a>`;
    }

    for (let i = Math.max(1, currentPage - 2); i <= Math.min(pages, currentPage + 2); i++) {
        if (i === currentPage) {
            html += `<span class="active">${i}</span>`;
        } else {
            html += `<a href="#" onclick="event.preventDefault(); searchProducts(${i})">${i}</a>`;
        }
    }

    if (currentPage < pages) {
        html += `<a href="#" onclick="event.preventDefault(); searchProducts(${currentPage + 1})">Επόμενη</a>`;
    }

    paginationContainer.innerHTML = html;
}
