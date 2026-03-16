// Cart Manager - Handles local storage based cart management with persistence

class CartManager {
    constructor(expirationDays = 7) {
        this.storageKey = 'poulki_cart';
        this.expirationKey = 'poulki_cart_expiration';
        this.expirationDays = expirationDays;
        this.initCart();
    }

    initCart() {
        const cart = this.getCart();
        const expiration = this.getExpiration();
        
        // Check if cart has expired
        if (expiration && new Date(expiration) < new Date()) {
            this.clearCart();
        }
    }

    getCart() {
        try {
            const cartData = localStorage.getItem(this.storageKey);
            return cartData ? JSON.parse(cartData) : {};
        } catch (error) {
            console.error('Error reading cart from localStorage:', error);
            return {};
        }
    }

    setCart(cart) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(cart));
            this.setExpiration();
        } catch (error) {
            console.error('Error saving cart to localStorage:', error);
        }
    }

    getExpiration() {
        return localStorage.getItem(this.expirationKey);
    }

    setExpiration() {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + this.expirationDays);
        localStorage.setItem(this.expirationKey, expirationDate.toISOString());
    }

    addItem(productId, productName, price, quantity = 1) {
        const cart = this.getCart();
        
        if (cart[productId]) {
            cart[productId].quantity += quantity;
        } else {
            cart[productId] = {
                id: productId,
                name: productName,
                price: parseFloat(price),
                quantity: quantity
            };
        }
        
        this.setCart(cart);
        return cart[productId];
    }

    removeItem(productId) {
        const cart = this.getCart();
        delete cart[productId];
        this.setCart(cart);
    }

    updateQuantity(productId, quantity) {
        const cart = this.getCart();
        
        if (cart[productId]) {
            if (quantity <= 0) {
                this.removeItem(productId);
            } else {
                cart[productId].quantity = quantity;
                this.setCart(cart);
            }
        }
    }

    getItemCount() {
        const cart = this.getCart();
        return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
    }

    getTotalPrice() {
        const cart = this.getCart();
        return Object.values(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    clearCart() {
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.expirationKey);
        } catch (error) {
            console.error('Error clearing cart from localStorage:', error);
        }
    }

    isEmpty() {
        return Object.keys(this.getCart()).length === 0;
    }
}

// Initialize cart manager globally
const cartManager = new CartManager(7); // 7 days expiration
