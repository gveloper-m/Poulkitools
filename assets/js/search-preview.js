// Search Preview functionality

let searchPreviewTimeout;
let lastSearchQuery = '';
let lastSearchTimestamp = 0;
let hidePreviewTimeout;

document.addEventListener('DOMContentLoaded', () => {
    // Handle header search (on all pages except homepage)
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('blur', () => {
            if (hidePreviewTimeout) clearTimeout(hidePreviewTimeout);
            hidePreviewTimeout = setTimeout(() => {
                hideSearchPreview();
            }, 300);
        });
    }

    // Handle banner search (only on homepage)
    const searchInputBanner = document.getElementById('searchInputBanner');
    if (searchInputBanner) {
        searchInputBanner.addEventListener('input', handleSearchInputBanner);
        searchInputBanner.addEventListener('blur', () => {
            if (hidePreviewTimeout) clearTimeout(hidePreviewTimeout);
            hidePreviewTimeout = setTimeout(() => {
                hideSearchPreviewBanner();
            }, 300);
        });
    }

    const previewContainer = document.getElementById('searchPreview');
    if (previewContainer) {
        previewContainer.addEventListener('mouseenter', () => {
            if (hidePreviewTimeout) clearTimeout(hidePreviewTimeout);
        });
        previewContainer.addEventListener('mouseleave', () => {
            if (hidePreviewTimeout) clearTimeout(hidePreviewTimeout);
            hidePreviewTimeout = setTimeout(() => {
                hideSearchPreview();
            }, 2000);
        });
    }

    const previewContainerBanner = document.getElementById('searchPreviewBanner');
    if (previewContainerBanner) {
        previewContainerBanner.addEventListener('mouseenter', () => {
            if (hidePreviewTimeout) clearTimeout(hidePreviewTimeout);
        });
        previewContainerBanner.addEventListener('mouseleave', () => {
            if (hidePreviewTimeout) clearTimeout(hidePreviewTimeout);
            hidePreviewTimeout = setTimeout(() => {
                hideSearchPreviewBanner();
            }, 2000);
        });
    }

    // Close preview when clicking outside
    document.addEventListener('click', (e) => {
        const navSearch = document.querySelector('.nav-search');
        if (navSearch && !navSearch.contains(e.target)) {
            hideSearchPreview();
        }
        
        const searchBannerContent = document.querySelector('.search-banner-content');
        if (searchBannerContent && !searchBannerContent.contains(e.target)) {
            hideSearchPreviewBanner();
        }
    });
});

// Header search handler
async function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    if (searchPreviewTimeout) {
        clearTimeout(searchPreviewTimeout);
    }
    
    if (query.length < 2) {
        hideSearchPreview();
        lastSearchQuery = '';
        return;
    }

    if (query === lastSearchQuery) {
        return;
    }

    lastSearchQuery = query;
    lastSearchTimestamp = Date.now();

    searchPreviewTimeout = setTimeout(() => {
        performSearchPreview(query, lastSearchTimestamp, false);
    }, 300);
}

// Banner search handler
async function handleSearchInputBanner(e) {
    const query = e.target.value.trim();
    
    if (searchPreviewTimeout) {
        clearTimeout(searchPreviewTimeout);
    }
    
    if (query.length < 2) {
        hideSearchPreviewBanner();
        lastSearchQuery = '';
        return;
    }

    if (query === lastSearchQuery) {
        return;
    }

    lastSearchQuery = query;
    lastSearchTimestamp = Date.now();

    searchPreviewTimeout = setTimeout(() => {
        performSearchPreview(query, lastSearchTimestamp, true);
    }, 300);
}

async function performSearchPreview(query, timestamp, isBanner) {
    try {
        const response = await fetch(`${API_BASE}/products.php?action=get_products&search=${encodeURIComponent(query)}&page=1&limit=100`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (timestamp === lastSearchTimestamp) {
            if (isBanner) {
                showSearchPreviewBanner(data.products, query);
            } else {
                showSearchPreview(data.products, query);
            }
        }
    } catch (error) {
        console.error('Error fetching search preview:', error);
        if (isBanner) {
            hideSearchPreviewBanner();
        } else {
            hideSearchPreview();
        }
    }
}

function showSearchPreview(products, query) {
    let previewContainer = document.getElementById('searchPreview');
    
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.id = 'searchPreview';
        previewContainer.className = 'search-preview';
        const navSearch = document.querySelector('.nav-search');
        if (navSearch) {
            navSearch.appendChild(previewContainer);
        }
    }

    if (!products || products.length === 0) {
        previewContainer.innerHTML = `<div class="search-preview-item no-results">Δεν βρέθηκαν αποτελέσματα</div>`;
        previewContainer.style.display = 'block';
        return;
    }

    const basePath = window.location.pathname.includes('/pages/') ? '../pages/' : 'pages/';
    const previewItems = products.slice(0, 6);
    
    const html = `
        ${previewItems.map(product => `
            <a href="${basePath}product.html?id=${product.id}" class="search-preview-item">
                <img src="${fixImagePath(product.image)}" alt="${product.name}" class="search-preview-image">
                <div class="search-preview-content">
                    <div class="search-preview-name">${product.name}</div>
                    <div class="search-preview-price">${formatPrice(product.thursday_price > 0 ? product.thursday_price : product.price_with_vat)}</div>
                </div>
            </a>
        `).join('')}
        <a href="${basePath}search.html?q=${encodeURIComponent(query)}" class="search-preview-item search-preview-view-all">
            Προβολή όλων των αποτελεσμάτων (${products.length})
        </a>
    `;

    previewContainer.innerHTML = html;
    previewContainer.style.display = 'block';
}

function showSearchPreviewBanner(products, query) {
    let previewContainer = document.getElementById('searchPreviewBanner');
    
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.id = 'searchPreviewBanner';
        previewContainer.className = 'search-preview-banner';
        const searchFormWrapper = document.querySelector('.search-form-banner-wrapper');
        if (searchFormWrapper) {
            searchFormWrapper.appendChild(previewContainer);
        }
    }

    if (!products || products.length === 0) {
        previewContainer.innerHTML = `<div class="search-preview-item no-results">Δεν βρέθηκαν αποτελέσματα</div>`;
        previewContainer.style.display = 'block';
        return;
    }

    const previewItems = products.slice(0, 6);
    
    const html = `
        ${previewItems.map(product => `
            <a href="pages/product.html?id=${product.id}" class="search-preview-item">
                <img src="${fixImagePath(product.image)}" alt="${product.name}" class="search-preview-image">
                <div class="search-preview-content">
                    <div class="search-preview-name">${product.name}</div>
                    <div class="search-preview-price">${formatPrice(product.thursday_price > 0 ? product.thursday_price : product.price_with_vat)}</div>
                </div>
            </a>
        `).join('')}
        <a href="pages/search.html?q=${encodeURIComponent(query)}" class="search-preview-item search-preview-view-all">
            Προβολή όλων των αποτελεσμάτων (${products.length})
        </a>
    `;

    previewContainer.innerHTML = html;
    previewContainer.style.display = 'block';
}

function hideSearchPreview() {
    const previewContainer = document.getElementById('searchPreview');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
}

function hideSearchPreviewBanner() {
    const previewContainer = document.getElementById('searchPreviewBanner');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
}

