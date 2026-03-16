// Categories Dropdown functionality

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOMContentLoaded - Categories Dropdown initializing');
    await loadCategoriesDropdown();
    setupCategoriesHover();
    setupProductsDropdownToggle();
    console.log('Categories dropdown setup complete');
});

async function loadCategoriesDropdown() {
    try {
        console.log('Loading categories from API:', `${API_BASE}/products.php?action=get_categories`);
        const response = await fetch(`${API_BASE}/products.php?action=get_categories`);
        const categories = await response.json();
        
        console.log('Categories loaded:', categories);

        const categoriesContainer = document.getElementById('categoriesDropdown');
        console.log('Categories container found:', !!categoriesContainer);
        
        if (!categoriesContainer || !categories.length) {
            console.warn('Categories container not found or no categories returned');
            return;
        }

        // Group categories by parent (first level)
        const groupedCategories = groupCategoriesByParent(categories);
        console.log('Grouped categories:', groupedCategories);
        
        // Build the dropdown HTML
        const html = buildCategoriesHTML(groupedCategories);
        categoriesContainer.innerHTML = html;
        console.log('Categories dropdown HTML populated');

    } catch (error) {
        console.error('Error loading categories dropdown:', error);
    }
}

function setupProductsDropdownToggle() {
    const productsDropdown = document.getElementById('productsDropdown');
    const categoriesDropdown = document.getElementById('categoriesDropdown');
    
    console.log('setupProductsDropdownToggle - productsDropdown:', !!productsDropdown);
    console.log('setupProductsDropdownToggle - categoriesDropdown:', !!categoriesDropdown);
    
    if (!productsDropdown || !categoriesDropdown) {
        console.warn('Dropdown elements not found');
        return;
    }
    
    // Toggle on click
    productsDropdown.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Dropdown clicked');
        categoriesDropdown.classList.toggle('show');
    });
    
    // Show on hover
    const wrapper = productsDropdown.closest('.nav-item-wrapper');
    console.log('Wrapper found:', !!wrapper);
    
    if (wrapper) {
        wrapper.addEventListener('mouseenter', () => {
            console.log('Hover enter - showing dropdown');
            categoriesDropdown.classList.add('show');
        });
        
        wrapper.addEventListener('mouseleave', () => {
            console.log('Hover leave - hiding dropdown');
            categoriesDropdown.classList.remove('show');
        });
    }
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!categoriesDropdown.contains(e.target) && e.target !== productsDropdown) {
            categoriesDropdown.classList.remove('show');
        }
    });
}

function groupCategoriesByParent(categories) {
    const grouped = {};
    
    categories.forEach(cat => {
        // Parse category name to detect parent/child structure
        // Assumes format like "Parent > Child" or just "Category"
        const parts = cat.category.split('>').map(p => p.trim());
        
        if (parts.length > 1) {
            // Has subcategory
            const parent = parts[0];
            const child = parts.slice(1).join(' > ');
            
            if (!grouped[parent]) {
                grouped[parent] = {
                    cat_id: cat.cat_id,
                    children: []
                };
            }
            
            grouped[parent].children.push({
                name: child,
                cat_id: cat.cat_id,
                category: cat.category
            });
        } else {
            // Parent category only
            const parent = parts[0];
            if (!grouped[parent]) {
                grouped[parent] = {
                    cat_id: cat.cat_id,
                    children: []
                };
            }
        }
    });
    
    return grouped;
}

function buildCategoriesHTML(groupedCategories) {
    let html = '';
    
    // Determine correct path for category links based on current location
    const getCategoryPath = () => {
        const currentPath = window.location.pathname;
        return currentPath.includes('/pages/') ? 'category.html' : 'pages/category.html';
    };
    const categoryPath = getCategoryPath();
    
    for (const [parentName, parentData] of Object.entries(groupedCategories)) {
        if (parentData.children.length > 0) {
            // Has subcategories - create expandable item
            html += `
                <div class="category-item has-children">
                    <a href="${categoryPath}?id=${parentData.cat_id}" class="category-link">
                        ${parentName}
                        <span class="category-arrow">›</span>
                    </a>
                    <div class="category-submenu">
            `;
            
            parentData.children.forEach(child => {
                html += `
                    <a href="${categoryPath}?id=${child.cat_id}" class="category-subitem">
                        ${child.name}
                    </a>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        } else {
            // No subcategories - simple link
            html += `
                <div class="category-item">
                    <a href="${categoryPath}?id=${parentData.cat_id}" class="category-link">
                        ${parentName}
                    </a>
                </div>
            `;
        }
    }
    
    return html;
}

function setupCategoriesHover() {
    const categoryItems = document.querySelectorAll('.category-item.has-children');
    
    categoryItems.forEach(item => {
        const submenu = item.querySelector('.category-submenu');
        
        item.addEventListener('mouseenter', () => {
            submenu.style.display = 'block';
            item.classList.add('open');
        });
        
        item.addEventListener('mouseleave', () => {
            submenu.style.display = 'none';
            item.classList.remove('open');
        });
    });
}
