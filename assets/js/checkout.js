// Checkout page functionality

document.addEventListener('DOMContentLoaded', async function() {
    // Set up breadcrumbs using BreadcrumbManager
    BreadcrumbManager.setBreadcrumb([
        { label: 'Αρχική', url: '../index.html' },
        { label: 'Καλάθι', url: 'cart.html' },
        { label: 'Ολοκλήρωση Αγοράς', current: true }
    ]);
    
    await loadShippingMethods();
    await loadPaymentMethods();
    await loadOrderSummary();

    const form = document.getElementById('checkoutForm');
    if (form) {
        form.addEventListener('submit', handleCheckout);
    }
});

async function loadShippingMethods() {
    try {
        const formData = new FormData();
        formData.append('action', 'get_shipping_methods');

        const shippingResponse = await fetch(`${API_BASE}/orders.php`, {
            method: 'POST',
            body: formData
        });

        if (!shippingResponse.ok) {
            throw new Error(`HTTP error! status: ${shippingResponse.status}`);
        }

        const text = await shippingResponse.text();
        if (!text) {
            console.error('Empty response from shipping methods API');
            return;
        }

        const methods = JSON.parse(text);

        const shippingContainer = document.getElementById('shippingMethods');
        if (shippingContainer && methods.length > 0) {
            shippingContainer.innerHTML = methods.map((method, index) => `
                <div class="radio-item shipping-item">
                    <input type="radio" id="shipping_${method.id}" name="shipping_method_id" value="${method.id}" 
                        data-cost="${method.cost || 0}"
                        ${index === 0 ? 'checked' : ''} required onchange="updateOrderTotal()">
                    <label for="shipping_${method.id}">
                        <div class="method-header">
                            ${method.name} - ${formatPrice(method.cost)}
                        </div>
                        ${method.description ? `<div class="method-description">${method.description}</div>` : ''}
                    </label>
                </div>
            `).join('');
            
            // Trigger initial total calculation
            updateOrderTotal();
        }
    } catch (error) {
        console.error('Error loading shipping methods:', error);
    }
}

async function loadPaymentMethods() {
    try {
        const formData = new FormData();
        formData.append('action', 'get_payment_methods');

        const response = await fetch(`${API_BASE}/orders.php`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        if (!text) {
            console.error('Empty response from payment methods API');
            return;
        }

        const methods = JSON.parse(text);

        const paymentContainer = document.getElementById('paymentMethods');
        if (paymentContainer && methods.length > 0) {
            paymentContainer.innerHTML = methods.map((method, index) => `
                <div class="radio-item payment-item">
                    <input type="radio" id="payment_${method.id}" name="payment_method_id" value="${method.id}" 
                        data-cost="${method.cost || 0}"
                        ${index === 0 ? 'checked' : ''} required onchange="updateOrderTotal()">
                    <label for="payment_${method.id}">
                        <div class="method-header">
                            ${method.name}${method.cost > 0 ? ` - ${formatPrice(method.cost)}` : ''}
                        </div>
                        ${method.description ? `<div class="method-description">${method.description}</div>` : ''}
                    </label>
                </div>
            `).join('');
            
            // Trigger initial total calculation
            updateOrderTotal();
        }
    } catch (error) {
        console.error('Error loading payment methods:', error);
    }
}

async function loadOrderSummary() {
    try {
        // Get cart from localStorage
        const cart = cartManager.getCart();

        const orderItems = document.getElementById('orderItems');
        const orderTotal = document.getElementById('orderTotal');

        if (!cart || Object.keys(cart).length === 0) {
            window.location.href = 'cart.html';
            return;
        }

        let html = '';
        let total = 0;
        
        Object.values(cart).forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            html += `
                <div class="order-item">
                    <span>${item.name} x ${item.quantity}</span>
                    <span>${formatPrice(itemTotal)}</span>
                </div>
            `;
        });

        orderItems.innerHTML = html;
        
        // Store cart total for later use
        window.cartTotal = total;
        
        // Update the final total with shipping and payment costs
        updateOrderTotal();
    } catch (error) {
        console.error('Error loading order summary:', error);
    }
}

function updateOrderTotal() {
    const cartTotal = window.cartTotal || 0;
    const orderTotal = document.getElementById('orderTotal');
    
    if (!orderTotal) return;
    
    let finalTotal = cartTotal;
    
    // Add shipping cost
    const selectedShipping = document.querySelector('input[name="shipping_method_id"]:checked');
    if (selectedShipping) {
        const shippingCost = parseFloat(selectedShipping.getAttribute('data-cost') || 0);
        finalTotal += shippingCost;
    }
    
    // Add payment cost
    const selectedPayment = document.querySelector('input[name="payment_method_id"]:checked');
    if (selectedPayment) {
        const paymentCost = parseFloat(selectedPayment.getAttribute('data-cost') || 0);
        finalTotal += paymentCost;
    }
    
    orderTotal.textContent = formatPrice(finalTotal).replace('€', '');
}

async function handleCheckout(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    formData.append('action', 'place_order');
    
    // Also include cart items for the backend
    const cart = cartManager.getCart();
    formData.append('cart_items', JSON.stringify(cart));

    try {
        const response = await fetch(`${API_BASE}/orders.php`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.error) {
            showNotification(data.error, 'error');
        } else {
            showNotification('Παραγγελία τοποθετήθηκε με επιτυχία!', 'success');
            cartManager.clearCart();
            updateCartCount();
            
            setTimeout(() => {
                window.location.href = `my-orders.html?code=${data.order_code}&email=${formData.get('customer_email')}`;
            }, 2000);
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showNotification('Σφάλμα κατά την τοποθέτηση της παραγγελίας', 'error');
    }
}
