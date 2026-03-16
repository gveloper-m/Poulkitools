// My Orders page functionality

document.addEventListener('DOMContentLoaded', async function() {
    // Set up breadcrumbs using BreadcrumbManager
    BreadcrumbManager.setBreadcrumb(BreadcrumbManager.createSimple('Παραγγελίες'));
    
    const orderSearchForm = document.getElementById('orderSearchForm');
    if (orderSearchForm) {
        orderSearchForm.addEventListener('submit', handleOrderSearch);
    }

    // Check if we're coming from checkout
    const params = new URLSearchParams(window.location.search);
    if (params.get('code') && params.get('email')) {
        document.getElementById('searchEmail').value = params.get('email');
        document.getElementById('searchOrderCode').value = params.get('code');
        await loadOrder(params.get('email'), params.get('code'));
    }
});

async function handleOrderSearch(event) {
    event.preventDefault();

    const email = document.getElementById('searchEmail').value;
    const orderCode = document.getElementById('searchOrderCode').value;

    if (!email) {
        showNotification('Παρακαλώ συμπληρώστε το email', 'error');
        return;
    }

    // If only email is provided, load all orders for that email
    if (!orderCode) {
        await loadOrdersByEmail(email);
    } else {
        // If both email and order code provided, load specific order
        await loadOrder(email, orderCode);
    }
}

async function loadOrdersByEmail(email) {
    try {
        const response = await fetch(`${API_BASE}/orders.php?action=get_order&email=${encodeURIComponent(email)}`);
        const data = await response.json();

        const orderResult = document.getElementById('orderResult');
        const orderDetails = document.getElementById('orderDetails');

        if (data.error) {
            showNotification(data.error, 'error');
            orderResult.style.display = 'none';
            return;
        }

        if (!data.orders || data.orders.length === 0) {
            showNotification('Δεν βρέθηκαν παραγγελίες για αυτό το email', 'error');
            orderResult.style.display = 'none';
            return;
        }

        const statusTranslations = {
            'pending': 'Εκκρεμής',
            'sent': 'Στάλθηκε',
            'not_sent': 'Δεν Στάλθηκε',
            'cancelled': 'Ακυρώθηκε',
            'returned': 'Επιστράφηκε'
        };

        let html = `<div class="orders-list-header"><strong>Βρέθηκαν ${data.orders.length} παραγγελία(ες):</strong></div>`;

        data.orders.forEach(order => {
            html += `
                <div class="order-card" style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <div class="order-header">
                        <div class="order-info">
                            <div class="info-label">Κωδικός Παραγγελίας</div>
                            <div class="info-value">${order.order_code}</div>
                        </div>
                        <div class="order-info">
                            <div class="info-label">Ημερομηνία</div>
                            <div class="info-value">${new Date(order.created_at).toLocaleDateString('el-GR')}</div>
                        </div>
                        <div class="order-info">
                            <div class="info-label">Κατάσταση</div>
                            <div class="info-value">${statusTranslations[order.status] || order.status}</div>
                        </div>
                        <div class="order-info">
                            <div class="info-label">Σύνολο</div>
                            <div class="info-value">${formatPrice(order.total_amount)}</div>
                        </div>
                    </div>
                </div>
            `;
        });

        orderDetails.innerHTML = html;
        orderResult.style.display = 'block';
    } catch (error) {
        showNotification('Σφάλμα κατά την φόρτωση των παραγγελιών: ' + error.message, 'error');
    }
}

async function loadOrder(email, orderCode) {
    try {
        const response = await fetch(`${API_BASE}/orders.php?action=get_order&order_code=${encodeURIComponent(orderCode)}&email=${encodeURIComponent(email)}`);
        const order = await response.json();

        const orderResult = document.getElementById('orderResult');
        const orderDetails = document.getElementById('orderDetails');

        if (order.error) {
            showNotification(order.error, 'error');
            orderResult.style.display = 'none';
            return;
        }

        const statusTranslations = {
            'pending': 'Εκκρεμής',
            'sent': 'Στάλθηκε',
            'not_sent': 'Δεν Στάλθηκε',
            'cancelled': 'Ακυρώθηκε',
            'returned': 'Επιστράφηκε'
        };

        let itemsHtml = '';
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                itemsHtml += `
                    <div class="order-item-detail">
                        <span>${item.name} x ${item.quantity}</span>
                        <span>${formatPrice(item.price * item.quantity)}</span>
                    </div>
                `;
            });
        }

        let trackingHtml = '';
        if (order.tracking_code) {
            trackingHtml = `
                <div class="order-tracking">
                    <strong>Κωδικός Αποστολής:</strong><br>
                    <span class="tracking-code">${order.tracking_code}</span>
                </div>
            `;
        }

        const html = `
            <div class="order-header">
                <div class="order-info">
                    <div class="info-label">Κωδικός Παραγγελίας</div>
                    <div class="info-value">${order.order_code}</div>
                </div>
                <div class="order-info">
                    <div class="info-label">Ημερομηνία</div>
                    <div class="info-value">${new Date(order.created_at).toLocaleDateString('el-GR')}</div>
                </div>
                <div class="order-info">
                    <div class="info-label">Κατάσταση</div>
                    <div class="info-value">${statusTranslations[order.status] || order.status}</div>
                </div>
                <div class="order-info">
                    <div class="info-label">Σύνολο</div>
                    <div class="info-value">${formatPrice(order.total_amount)}</div>
                </div>
            </div>

            <div class="order-items">
                <div class="order-items-title">Προϊόντα</div>
                ${itemsHtml}
            </div>

            <div class="order-info">
                <div class="info-label">Πληροφορίες Παραλαβής</div>
                <div class="info-value">
                    <p><strong>${order.customer_name}</strong></p>
                    <p>${order.customer_address}</p>
                    <p>Τηλέφωνο: ${order.customer_phone}</p>
                    <p>Email: ${order.customer_email}</p>
                </div>
            </div>

            ${trackingHtml}

            ${order.notes ? `
                <div class="order-info">
                    <div class="info-label">Σημειώσεις</div>
                    <div class="info-value">${order.notes}</div>
                </div>
            ` : ''}

            <div class="order-info">
                <div class="info-label">Τρόπος Αποστολής</div>
                <div class="info-value">${order.shipping_method?.name || 'N/A'}</div>
            </div>

            <div class="order-info">
                <div class="info-label">Τρόπος Πληρωμής</div>
                <div class="info-value">${order.payment_method?.name || 'N/A'}</div>
            </div>
        `;

        orderDetails.innerHTML = html;
        orderResult.style.display = 'block';
        showNotification('Παραγγελία βρέθηκε!', 'success');
    } catch (error) {
        console.error('Error loading order:', error);
        showNotification('Σφάλμα κατά τη φόρτωση της παραγγελίας', 'error');
    }
}
