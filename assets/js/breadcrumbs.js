
// Breadcrumb management system for all pages

class BreadcrumbManager {
    static init() {
        const breadcrumbContainer = document.querySelector('.breadcrumb');
        if (!breadcrumbContainer) return;

        // Restore breadcrumb state from previous navigation
        const breadcrumbData = sessionStorage.getItem('breadcrumbData');
        if (breadcrumbData) {
            try {
                const data = JSON.parse(breadcrumbData);
                this.renderBreadcrumbs(data);
            } catch (e) {
                console.error('Failed to parse breadcrumb data:', e);
            }
        }
    }

    static setBreadcrumb(breadcrumbs) {
        // breadcrumbs should be an array of {label, url?, filter?, id?, current?}
        if (!breadcrumbs || !Array.isArray(breadcrumbs)) return;
        
        sessionStorage.setItem('breadcrumbData', JSON.stringify(breadcrumbs));
        this.renderBreadcrumbs(breadcrumbs);
    }

    static renderBreadcrumbs(breadcrumbs) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
            const breadcrumbContainer = document.querySelector('.breadcrumb');
            if (!breadcrumbContainer) return;

            const html = breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;
                
                if (isLast || item.current) {
                    return `<span>${item.label}</span>`;
                }
                
                let href = item.url || '#';
                if (item.filter && item.id) {
                    href = `../pages/category.html?id=${item.id}&filter=${encodeURIComponent(item.filter)}`;
                } else if (item.id) {
                    href = `../pages/category.html?id=${item.id}`;
                }
                
                return `<a href="${href}">${item.label}</a>`;
            }).join(' / ');

            breadcrumbContainer.innerHTML = html;
        });
    }

    static createFromProduct(product) {
        // Create breadcrumbs from product category hierarchy
        const breadcrumbs = [{ label: 'Αρχική', url: '../index.html' }];
        
        if (product.category) {
            const categoryParts = product.category.split('>').map(p => p.trim());
            
            categoryParts.forEach((part, index) => {
                const isLast = index === categoryParts.length - 1;
                const categoryFilter = categoryParts.slice(0, index + 1).join(' > ');
                
                breadcrumbs.push({
                    label: part,
                    id: product.cat_id,
                    filter: categoryFilter,
                    current: isLast
                });
            });
        }
        
        return breadcrumbs;
    }

    static createFromCategory(categoryName, categoryId) {
        // Create breadcrumbs from category level with clickable parts
        const breadcrumbs = [{ label: 'Αρχική', url: '../index.html' }];
        
        if (categoryName) {
            // Split category by '>' to get individual parts
            const categoryParts = categoryName.split('>').map(p => p.trim());
            
            categoryParts.forEach((part, index) => {
                const isLast = index === categoryParts.length - 1;
                const categoryFilter = categoryParts.slice(0, index + 1).join(' > ');
                
                breadcrumbs.push({
                    label: part,
                    id: categoryId,
                    filter: categoryFilter,
                    current: isLast
                });
            });
        }
        
        return breadcrumbs;
    }

    static createFromSearchResults(query) {
        // Create breadcrumbs for search results
        return [
            { label: 'Αρχική', url: '../index.html' },
            { label: `Αποτελέσματα αναζήτησης: "${query}"`, current: true }
        ];
    }

    static createSimple(currentPageLabel) {
        // Create simple breadcrumbs for static pages
        return [
            { label: 'Αρχική', url: '../index.html' },
            { label: currentPageLabel, current: true }
        ];
    }

    static clearBreadcrumbs() {
        sessionStorage.removeItem('breadcrumbData');
    }
}

// Initialize on DOMContentLoaded if not already done
document.addEventListener('DOMContentLoaded', () => {
    BreadcrumbManager.init();
});
