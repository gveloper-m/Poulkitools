// Products Menu - Load categories into dropdown with hover submenus
let menuHideTimeout = null;
let productsSubMenuElement = null;
let isMenuOpen = false;

function loadProductsMenu() {
    const productsSubMenu = document.getElementById('productsSubMenu');
    if (!productsSubMenu) return;
    
    productsSubMenuElement = productsSubMenu;
    
    fetch(getApiUrl('/products.php?action=get_categories'))
        .then(response => response.json())
        .then(categories => {
            if (!categories || !Array.isArray(categories)) return;
            
            // Build hierarchy same way as mobile menu
            const hierarchy = buildHierarchy(categories);
            
            // Determine correct path for category links based on current location
            const getCategoryPath = () => {
                const currentPath = window.location.pathname;
                return currentPath.includes('/pages/') ? 'category.html' : 'pages/category.html';
            };
            
            const categoryPath = getCategoryPath();
            
            // Build HTML recursively
            let html = '';
            
            function buildSubmenuHTML(node) {
                let submenuHtml = '';
                if (node.children && node.children.length > 0) {
                    node.children.forEach(child => {
                        const href = child.cat_id ? `${categoryPath}?id=${child.cat_id}` : '#';
                        const hasChildren = child.children && child.children.length > 0;
                        
                        if (hasChildren) {
                            submenuHtml += `<li class="category-item">
                                <a href="${href}" class="category-link">${child.name}</a>
                                <ul class="submenu">`;
                            // Level 2 children
                            child.children.forEach(grandchild => {
                                const grandchildHref = grandchild.cat_id ? `${categoryPath}?id=${grandchild.cat_id}` : '#';
                                const grandchildHasChildren = grandchild.children && grandchild.children.length > 0;
                                
                                if (grandchildHasChildren) {
                                    submenuHtml += `<li class="category-item">
                                        <a href="${grandchildHref}" class="category-link">${grandchild.name}</a>
                                        <ul class="submenu">`;
                                    // Level 3 children (great-grandchildren)
                                    grandchild.children.forEach(ggchild => {
                                        const ggchildHref = ggchild.cat_id ? `${categoryPath}?id=${ggchild.cat_id}` : '#';
                                        const ggchildHasChildren = ggchild.children && ggchild.children.length > 0;
                                        
                                        if (ggchildHasChildren) {
                                            submenuHtml += `<li class="category-item">
                                                <a href="${ggchildHref}" class="category-link">${ggchild.name}</a>
                                                <ul class="submenu">`;
                                            // Level 4 children
                                            ggchild.children.forEach(gggchild => {
                                                const gggchildHref = gggchild.cat_id ? `${categoryPath}?id=${gggchild.cat_id}` : '#';
                                                const gggchildHasChildren = gggchild.children && gggchild.children.length > 0;
                                                
                                                if (gggchildHasChildren) {
                                                    submenuHtml += `<li class="category-item">
                                                        <a href="${gggchildHref}" class="category-link">${gggchild.name}</a>
                                                        <ul class="submenu">`;
                                                    // Level 5 children
                                                    gggchild.children.forEach(ggggchild => {
                                                        const ggggchildHref = ggggchild.cat_id ? `${categoryPath}?id=${ggggchild.cat_id}` : '#';
                                                        submenuHtml += `<li><a href="${ggggchildHref}">${ggggchild.name}</a></li>`;
                                                    });
                                                    submenuHtml += `</ul>
                                                    </li>`;
                                                } else {
                                                    submenuHtml += `<li><a href="${gggchildHref}">${gggchild.name}</a></li>`;
                                                }
                                            });
                                            submenuHtml += `</ul>
                                            </li>`;
                                        } else {
                                            submenuHtml += `<li><a href="${ggchildHref}">${ggchild.name}</a></li>`;
                                        }
                                    });
                                    submenuHtml += `</ul>
                                    </li>`;
                                } else {
                                    submenuHtml += `<li><a href="${grandchildHref}">${grandchild.name}</a></li>`;
                                }
                            });
                            submenuHtml += `</ul>
                            </li>`;
                        } else {
                            submenuHtml += `<li><a href="${href}">${child.name}</a></li>`;
                        }
                    });
                }
                return submenuHtml;
            }
            
            html = buildSubmenuHTML(hierarchy);
            
            productsSubMenu.innerHTML = html;
            
            // Initially hide menu, show on hover
            productsSubMenu.style.display = 'none';
            productsSubMenu.style.visibility = 'hidden';
            productsSubMenu.style.opacity = '0';
            
            // Add hover handlers to parent li
            const parentLi = productsSubMenu.parentElement;
            if (parentLi) {
                parentLi.addEventListener('mouseenter', openProductsMenu);
                parentLi.addEventListener('mouseleave', closeProductsMenuDelayed);
            }
        })
        .catch(error => console.error('Menu error:', error));
}

// Build hierarchy tree from flat category list
function buildHierarchy(categories) {
    const tree = {
        name: 'Root',
        level: 0,
        children: []
    };
    
    categories.forEach(cat => {
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
            
            currentNode = child;
            level++;
        });
    });
    
    return tree;
}

function openProductsMenu() {
    if (!productsSubMenuElement) return;
    
    // Clear any pending close timeout
    if (menuHideTimeout) {
        clearTimeout(menuHideTimeout);
        menuHideTimeout = null;
    }
    
    // Show menu
    isMenuOpen = true;
    productsSubMenuElement.style.display = 'block';
    productsSubMenuElement.style.visibility = 'visible';
    productsSubMenuElement.style.opacity = '1';
}

function closeProductsMenuDelayed() {
    if (!productsSubMenuElement) return;
    
    // Clear any existing timeout
    if (menuHideTimeout) {
        clearTimeout(menuHideTimeout);
    }
    
    // Wait 2 seconds before closing
    menuHideTimeout = setTimeout(() => {
        if (isMenuOpen) {
            isMenuOpen = false;
            productsSubMenuElement.style.display = 'none';
            productsSubMenuElement.style.visibility = 'hidden';
            productsSubMenuElement.style.opacity = '0';
        }
    }, 2000);
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadProductsMenu);
} else {
    loadProductsMenu();
}

