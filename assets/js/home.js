// Home page functionality

document.addEventListener('DOMContentLoaded', async function() {
    // Clear breadcrumbs on homepage
    BreadcrumbManager.clearBreadcrumbs();
    
    await loadSearchImage();
    await loadProducts();
    await loadBanners();
});

async function loadSearchImage() {
    try {
        const response = await fetch(`${API_BASE}/public.php?action=get_search_image`);
        
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            return;
        }

        const text = await response.text();
        if (!text) {
            console.warn('Empty response from search image API');
            return;
        }

        try {
            const data = JSON.parse(text);

            if (data.search_image) {
                const searchBannerSection = document.getElementById('searchBannerSection');
                const searchBannerImage = document.getElementById('searchBannerImage');
                
                if (searchBannerSection && searchBannerImage) {
                    searchBannerImage.src = fixImagePath(data.search_image);
                    searchBannerSection.style.display = 'block';

                    // Set up search form in banner
                    const searchFormBanner = document.getElementById('searchFormBanner');
                    if (searchFormBanner) {
                        searchFormBanner.addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const query = document.getElementById('searchInputBanner').value;
                            if (query.trim()) {
                                window.location.href = `pages/search.html?q=${encodeURIComponent(query)}`;
                            }
                        });
                    }
                }
            }
        } catch (parseError) {
            console.error('Invalid JSON response from search image API:', text, parseError);
        }
    } catch (error) {
        console.error('Error loading search image:', error);
    }
}

async function loadBanners() {
    try {
        const response = await fetch(`${API_BASE}/public.php?action=get_banners`);
        
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            return;
        }

        const text = await response.text();
        if (!text) {
            console.warn('Empty response from banners API');
            return;
        }

        const banners = JSON.parse(text);

        const bannersContainer = document.getElementById('bannersContainer');
        if (bannersContainer) {
            if (banners.length > 0) {
                bannersContainer.innerHTML = banners.map(banner => `
                    <div class="banner">
                        <img src="${fixImagePath(banner.image_path)}" alt="${banner.title}">
                        ${banner.link ? `<a href="${banner.link}"></a>` : ''}
                    </div>
                `).join('');
            } else {
                bannersContainer.innerHTML = '<p class="text-center">Δεν υπάρχουν διαθέσιμα banners</p>';
            }
        }
    } catch (error) {
        console.error('Error loading banners:', error);
    }
}

async function loadProducts(page = 1) {
    try {
        const response = await fetch(`${API_BASE}/products.php?action=get_products&page=${page}&limit=20`);
        
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            return;
        }

        const text = await response.text();
        if (!text) {
            console.warn('Empty response from products API');
            return;
        }

        const data = JSON.parse(text);

        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) {
            if (data.products.length > 0) {
                productsGrid.innerHTML = data.products.map(product => createProductCard(product)).join('');
            } else {
                productsGrid.innerHTML = `<p class="text-center">${translate('loading')}</p>`;
            }
        }

        // Create pagination
        createPagination(data.pages, page, (p) => loadProducts(p));
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function createPagination(pages, currentPage, callback) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer || pages <= 1) return;

    // Check if mobile (768px or less)
    const isMobile = window.innerWidth <= 768;
    const pageRange = isMobile ? 1 : 2; // Show 4 pages on mobile, 5 on desktop

    let html = '';

    if (currentPage > 1) {
        html += `<a href="#" class="pagination-link" data-page="${currentPage - 1}">Προηγούμενη</a>`;
    }

    for (let i = Math.max(1, currentPage - pageRange); i <= Math.min(pages, currentPage + pageRange); i++) {
        if (i === currentPage) {
            html += `<span class="active">${i}</span>`;
        } else {
            html += `<a href="#" class="pagination-link" data-page="${i}">${i}</a>`;
        }
    }

    if (currentPage < pages) {
        html += `<a href="#" class="pagination-link" data-page="${currentPage + 1}">Επόμενη</a>`;
    }

    paginationContainer.innerHTML = html;

    // Add event listeners to pagination links
    paginationContainer.querySelectorAll('.pagination-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(link.dataset.page);
            callback(page);
        });
    });
}
