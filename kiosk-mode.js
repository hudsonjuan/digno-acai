// Kiosk Mode Configuration
const KIOSK_CONFIG = {
    inactivityTimeout: 90 * 1000, // 90 seconds in milliseconds
    resetDelay: 3000, // 3 seconds to show reset message
    isKioskMode: new URLSearchParams(window.location.search).get('kiosk') === '1',
    inactivityTimer: null,
    resetTimer: null,
    customerName: null
};

/**
 * Initialize kiosk mode if kiosk parameter is present
 */
function initKioskMode() {
    if (!KIOSK_CONFIG.isKioskMode) return;
    
    // Apply kiosk mode styles and setup
    applyKioskStyles();
    setupKioskEventListeners();
    
    // Check for existing customer name in session
    KIOSK_CONFIG.customerName = sessionStorage.getItem('customerName');
    
    if (!KIOSK_CONFIG.customerName) {
        showCustomerNameOverlay();
    } else {
        // If returning with a name, ensure the overlay is hidden
        hideCustomerNameOverlay();
    }
    
    // Start inactivity timer
    resetInactivityTimer();
    
    console.log('Kiosk mode activated');
}

/**
 * Apply kiosk-specific styles
 */
function applyKioskStyles() {
    const style = document.createElement('style');
    style.id = 'kiosk-styles';
    style.textContent = `
        /* Prevent text selection and tap highlight */
        * {
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -khtml-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            outline: none !important;
        }
        
        /* Disable zooming and scrolling */
        html, body {
            touch-action: manipulation;
            overflow: hidden;
            position: fixed;
            width: 100%;
            height: 100%;
        }
        
        /* Customer name overlay */
        #kiosk-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: white;
            text-align: center;
            padding: 20px;
            box-sizing: border-box;
        }
        
        #kiosk-overlay-content {
            max-width: 500px;
            width: 100%;
        }
        
        #kiosk-overlay h2 {
            font-size: 2rem;
            margin-bottom: 2rem;
            color: #fff;
        }
        
        #customer-name-input {
            width: 80%;
            padding: 15px;
            font-size: 1.2rem;
            margin-bottom: 1.5rem;
            border: 2px solid #4CAF50;
            border-radius: 5px;
            text-align: center;
        }
        
        #start-order-btn {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 1.2rem;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        
        #start-order-btn:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
        }
        
        #start-order-btn:not(:disabled):hover {
            background-color: #45a049;
        }
        
        /* Hide reset message by default */
        #reset-message {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            padding: 10px;
            background-color: #f8d7da;
            color: #721c24;
            text-align: center;
            z-index: 10000;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Show customer name overlay
 */
function showCustomerNameOverlay() {
    // Create overlay if it doesn't exist
    let overlay = document.getElementById('kiosk-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'kiosk-overlay';
        
        const content = document.createElement('div');
        content.id = 'kiosk-overlay-content';
        
        content.innerHTML = `
            <h2>Bem-vindo ao Digno Açaí!</h2>
            <p>Por favor, digite seu nome para começar seu pedido:</p>
            <input type="text" id="customer-name-input" placeholder="Seu nome" autofocus>
            <button id="start-order-btn" disabled>COMEÇAR PEDIDO</button>
        `;
        
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        // Add event listeners
        const nameInput = document.getElementById('customer-name-input');
        const startButton = document.getElementById('start-order-btn');
        
        nameInput.addEventListener('input', function() {
            startButton.disabled = !this.value.trim();
        });
        
        nameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && this.value.trim()) {
                startOrder();
            }
        });
        
        startButton.addEventListener('click', startOrder);
    }
    
    overlay.style.display = 'flex';
}

/**
 * Hide customer name overlay
 */
function hideCustomerNameOverlay() {
    const overlay = document.getElementById('kiosk-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

/**
 * Start order with customer name
 */
function startOrder() {
    const nameInput = document.getElementById('customer-name-input');
    if (nameInput && nameInput.value.trim()) {
        KIOSK_CONFIG.customerName = nameInput.value.trim();
        sessionStorage.setItem('customerName', KIOSK_CONFIG.customerName);
        hideCustomerNameOverlay();
        resetInactivityTimer();
    }
}

/**
 * Show reset message and prepare for reset
 */
function showResetMessage() {
    const resetMessage = document.createElement('div');
    resetMessage.id = 'reset-message';
    resetMessage.textContent = 'Reiniciando o sistema...';
    document.body.appendChild(resetMessage);
    resetMessage.style.display = 'block';
    
    // Clear session and reset after delay
    setTimeout(() => {
        sessionStorage.removeItem('customerName');
        window.location.href = window.location.pathname + '?kiosk=1';
    }, KIOSK_CONFIG.resetDelay);
}

/**
 * Setup event listeners for kiosk mode
 */
function setupKioskEventListeners() {
    // Prevent context menu on long press
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    }, { passive: false });
    
    // Disable zoom and other gestures
    document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
        return false;
    }, { passive: false });
    
    // Disable double tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });
    
    // Reset inactivity timer on any user interaction
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'click', 'scroll', 'input'];
    events.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, { passive: true });
    });
    
    // Override the order confirmation to add customer name
    if (typeof window.buildOrderMessage === 'function') {
        const originalBuildOrderMessage = window.buildOrderMessage;
        window.buildOrderMessage = function() {
            let message = originalBuildOrderMessage.apply(this, arguments);
            if (KIOSK_CONFIG.customerName) {
                message = `Cliente: ${KIOSK_CONFIG.customerName}\n\n${message}`;
            }
            return message;
        };
    }
    
    // Handle order completion
    if (typeof window.resetOrder === 'function') {
        const originalResetOrder = window.resetOrder;
        window.resetOrder = function() {
            originalResetOrder.apply(this, arguments);
            if (KIOSK_CONFIG.isKioskMode) {
                showResetMessage();
            }
        };
    }
}

/**
 * Reset the inactivity timer
 */
function resetInactivityTimer() {
    if (!KIOSK_CONFIG.isKioskMode) return;
    
    if (KIOSK_CONFIG.inactivityTimer) {
        clearTimeout(KIOSK_CONFIG.inactivityTimer);
    }
    
    KIOSK_CONFIG.inactivityTimer = setTimeout(() => {
        showResetMessage();
        window.scrollTo(0, 0);
        
        // Show a message (optional)
        if (typeof showNotification === 'function') {
            showNotification('Sessão reiniciada por inatividade', 'info');
        }
        
    }, KIOSK_CONFIG.inactivityTimeout);
}

/**
 * Show a notification (if notification system exists)
 */
function showNotification(message, type = 'info') {
    // Check if there's a notification system already
    if (window.showNotification) {
        window.showNotification(message, type);
        return;
    }
    
    // Fallback simple notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        z-index: 1000;
        animation: fadeInOut 3s ease-in-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after animation
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize kiosk mode when DOM is loaded
document.addEventListener('DOMContentLoaded', initKioskMode);

// Add CSS for notifications if not already present
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        10% { opacity: 1; transform: translateX(-50%) translateY(0); }
        90% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
`;
document.head.appendChild(notificationStyle);
