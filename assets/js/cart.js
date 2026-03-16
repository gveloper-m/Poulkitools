// Cart page functionality

document.addEventListener('DOMContentLoaded', async function() {
    // Set up breadcrumbs using BreadcrumbManager
    BreadcrumbManager.setBreadcrumb(BreadcrumbManager.createSimple('Καλάθι'));
    
    loadCart();
});

function loadCart() {
    const cart = cartManager.getCart();
    const cartItems = document.getElementById('cartItems');
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');

    if (!cartItems || !subtotalEl || !totalEl) return;

    if (Object.keys(cart).length === 0) {
        cartItems.innerHTML = '<tr><td colspan="5" class="empty-cart">Το καλάθι σας είναι κενό</td></tr>';
        subtotalEl.textContent = '0,00€';
        totalEl.textContent = '0,00€';
        return;
    }

    let html = '';
    let total = 0;

    Object.values(cart).forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        html += `
            <tr>
                <td>${item.name}</td>
                <td>${formatPrice(item.price)}</td>
                <td>
                    <input type="number" value="${item.quantity}" min="1" 
                        onchange="updateItemQuantity(${item.id}, this.value)" 
                        class="quantity-input" style="width: 60px;">
                </td>
                <td>${formatPrice(itemTotal)}</td>
                <td>
                    <button class="btn btn-secondary" onclick="removeFromCart(${item.id})">
                        ${translate('remove')}
                    </button>
                </td>
            </tr>
        `;
    });

    cartItems.innerHTML = html;
    subtotalEl.textContent = formatPrice(total).replace('€', '');
    totalEl.textContent = formatPrice(total).replace('€', '');
}

function updateItemQuantity(productId, quantity) {
    quantity = parseInt(quantity);
    if (quantity < 1) {
        removeFromCart(productId);
        return;
    }

    cartManager.updateQuantity(productId, quantity);
    updateCartCount();
    loadCart();
}

function removeFromCart(productId) {
    cartManager.removeItem(productId);
    showNotification('Το προϊόν αφαιρέθηκε από το καλάθι', 'success');
    updateCartCount();
    loadCart();
}
