// Admin Panel Configuration
const ADMIN_CONFIG = {
    supabaseUrl: null,
    supabaseAnonKey: null,
    soundEnabled: true,
    refreshInterval: 5000, // 5 seconds for polling
    lastOrderCount: 0
};

// Initialize Supabase client (will be set in initializeSupabase)
let currentUser = null;
let orders = [];
let refreshTimer = null;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const adminDashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    initializeSupabase();
    checkAuth();
    setupEventListeners();
});

async function loadConfig() {
    try {
        const response = await fetch('/.netlify/functions/get-config');
        const data = await response.json();
        ADMIN_CONFIG.supabaseUrl = data.SUPABASE_URL;
        ADMIN_CONFIG.supabaseAnonKey = data.SUPABASE_ANON_KEY;
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

function initializeSupabase() {
    console.log('Admin: Verificando configuração Supabase...');
    console.log('Admin: supabaseUrl:', ADMIN_CONFIG.supabaseUrl);
    console.log('Admin: supabaseAnonKey:', ADMIN_CONFIG.supabaseAnonKey ? 'Configurada' : 'Não configurada');
    
    if (ADMIN_CONFIG.supabaseUrl && ADMIN_CONFIG.supabaseAnonKey) {
        console.log('Admin: Configuração OK, usando API REST diretamente');
    } else {
        console.error('Supabase configuration not found');
        console.error('supabaseUrl:', ADMIN_CONFIG.supabaseUrl);
        console.error('supabaseAnonKey:', ADMIN_CONFIG.supabaseAnonKey ? 'Configurada' : 'Não configurada');
        showError('Erro de configuração. Entre em contato com o suporte.');
    }
}

function checkAuth() {
    const token = localStorage.getItem('adminToken');
    if (token) {
        currentUser = JSON.parse(token);
        showDashboard();
    }
}

function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Sound toggle
    document.getElementById('sound-toggle').addEventListener('click', toggleSound);
    
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', loadOrders);
    
    // Filters
    document.getElementById('search-input').addEventListener('input', debounce(filterOrders, 300));
    document.getElementById('status-filter').addEventListener('change', filterOrders);
    document.getElementById('origin-filter').addEventListener('change', filterOrders);
    
    // History
    document.getElementById('show-history-btn').addEventListener('click', toggleHistory);
    
    // Close modal
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('order-modal').addEventListener('click', (e) => {
        if (e.target.id === 'order-modal') closeModal();
    });
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    console.log('Login attempt:', email);
    
    try {
        // Simple authentication (in production, use Supabase Auth)
        if (email === 'admin@dignoacai.com' && password === 'admin123') {
            console.log('Login successful');
            currentUser = { email, name: 'Administrador' };
            localStorage.setItem('adminToken', JSON.stringify(currentUser));
            showDashboard();
        } else {
            console.log('Invalid credentials');
            showError('Email ou senha inválidos');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Erro ao fazer login. Tente novamente.');
    }
}

function handleLogout() {
    localStorage.removeItem('adminToken');
    currentUser = null;
    hideDashboard();
}

function showDashboard() {
    loginScreen.style.display = 'none';
    adminDashboard.style.display = 'block';
    loadOrders();
    startAutoRefresh();
}

function hideDashboard() {
    loginScreen.style.display = 'flex';
    adminDashboard.style.display = 'none';
    stopAutoRefresh();
}

function showError(message) {
    loginError.textContent = message;
    loginError.classList.add('show');
    setTimeout(() => loginError.classList.remove('show'), 5000);
}

function toggleSound() {
    ADMIN_CONFIG.soundEnabled = !ADMIN_CONFIG.soundEnabled;
    const btn = document.getElementById('sound-toggle');
    btn.classList.toggle('active', ADMIN_CONFIG.soundEnabled);
}

function startAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(loadOrders, ADMIN_CONFIG.refreshInterval);
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

async function loadOrders() {
    if (!ADMIN_CONFIG.supabaseUrl || !ADMIN_CONFIG.supabaseAnonKey) {
        console.error('Admin: Supabase config not available');
        return;
    }
    
    try {
        const cleanUrl = ADMIN_CONFIG.supabaseUrl.replace(/\/rest\/v1\/?$/, '');
        console.log('Admin: Fetching orders from:', `${cleanUrl}/rest/v1/orders`);
        
        const response = await fetch(`${cleanUrl}/rest/v1/orders?select=*&order=created_at.desc&limit=100`, {
            headers: {
                'apikey': ADMIN_CONFIG.supabaseAnonKey,
                'Authorization': `Bearer ${ADMIN_CONFIG.supabaseAnonKey}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Admin: Orders received:', data);
        orders = data || [];
        console.log('Admin: Orders array length:', orders.length);
        
        // Check for new orders
        const currentCount = orders.filter(o => o.status === 'new').length;
        if (currentCount > ADMIN_CONFIG.lastOrderCount && ADMIN_CONFIG.soundEnabled) {
            playNotificationSound();
        }
        ADMIN_CONFIG.lastOrderCount = currentCount;
        
        console.log('Admin: Calling renderOrders');
        renderOrders();
        updateStats();
        
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function renderOrders() {
    const columns = {
        new: document.getElementById('orders-new'),
        preparing: document.getElementById('orders-preparing'),
        ready: document.getElementById('orders-ready'),
        completed: document.getElementById('orders-completed')
    };
    
    // Clear columns
    Object.values(columns).forEach(col => col.innerHTML = '');
    
    // Filter and sort orders
    const filteredOrders = filterOrdersList(orders);
    
    // Distribute orders to columns
    filteredOrders.forEach(order => {
        const card = createOrderCard(order);
        if (columns[order.status]) {
            columns[order.status].appendChild(card);
        }
    });
    
    // Update column counts
    updateColumnCounts();
}

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = `order-card ${order.status}`;
    card.dataset.orderId = order.id;
    
    const time = formatTime(order.created_at);
    const items = formatItems(order.items);
    const total = formatCurrency(order.total_cents);
    
    // Extrair detalhes do pedido
    let size = '-';
    let toppings = [];
    let sorvetes = [];
    let caldas = [];
    let notes = '';
    
    if (order.items && order.items.length > 0) {
        const item = order.items[0];
        size = item.size || '-';
        
        // Lista de sorvetes e caldas para filtragem
        const sorvetesList = ['Creme com passas', 'Morango'];
        const caldasList = ['Leite condensado', 'Chocolate', 'Morango', 'Uva', 'Babalu'];
        
        if (item.addons) {
            // Extrair sorvetes, caldas e acompanhamentos do array addons
            sorvetes = item.addons.filter(a => sorvetesList.includes(a));
            caldas = item.addons.filter(a => caldasList.includes(a));
            toppings = item.addons.filter(a => 
                !sorvetesList.includes(a) && !caldasList.includes(a)
            );
        }
        
        notes = item.notes || '';
    }
    
    card.innerHTML = `
        <div class="order-card-header">
            <span class="order-number">#${order.order_number}</span>
            <span class="order-time">${time}</span>
        </div>
        <div class="order-customer">${order.customer_name}</div>
        <div class="order-details">
            <div class="order-detail-line"><strong>Tamanho:</strong> ${size}</div>
            ${toppings.length > 0 ? `<div class="order-detail-line"><strong>Acomp:</strong> ${toppings.join(', ')}</div>` : ''}
            ${sorvetes.length > 0 ? `<div class="order-detail-line"><strong>Sorvetes:</strong> ${sorvetes.join(', ')}</div>` : ''}
            ${caldas.length > 0 ? `<div class="order-detail-line"><strong>Caldas:</strong> ${caldas.join(', ')}</div>` : ''}
            ${notes ? `<div class="order-detail-line"><strong>Obs:</strong> ${notes}</div>` : ''}
        </div>
        <div class="order-meta">
            <span class="order-origin ${order.origin}">${order.origin === 'kiosk' ? '📱 Kiosk' : '🌐 Online'}</span>
        </div>
        <div class="order-total">${total}</div>
        <div class="order-actions">
            ${getActionButtons(order)}
        </div>
    `;
    
    // Add click event to open modal
    card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('action-btn')) {
            openOrderModal(order.id);
        }
    });
    
    // Add action button events
    card.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleAction(order.id, btn.dataset.action);
        });
    });
    
    return card;
}

function getActionButtons(order) {
    const buttons = [];
    
    switch (order.status) {
        case 'new':
            buttons.push('<button class="action-btn accept" data-action="accept">Aceitar</button>');
            buttons.push('<button class="action-btn cancel" data-action="cancel">Cancelar</button>');
            break;
        case 'preparing':
            buttons.push('<button class="action-btn ready" data-action="ready">Marcar como Pronto</button>');
            buttons.push('<button class="action-btn cancel" data-action="cancel">Cancelar</button>');
            break;
        case 'ready':
            buttons.push('<button class="action-btn complete" data-action="complete">Finalizar</button>');
            buttons.push('<button class="action-btn cancel" data-action="cancel">Cancelar</button>');
            break;
        case 'completed':
            buttons.push('<button class="action-btn" data-action="view">Ver Detalhes</button>');
            break;
    }
    
    return buttons.join('');
}

async function handleAction(orderId, action) {
    let newStatus = null;
    
    switch (action) {
        case 'accept':
            newStatus = 'preparing';
            break;
        case 'ready':
            newStatus = 'ready';
            break;
        case 'complete':
            newStatus = 'completed';
            break;
        case 'cancel':
            if (confirm('Tem certeza que deseja cancelar este pedido?')) {
                newStatus = 'cancelled';
            } else {
                return;
            }
            break;
        case 'view':
            openOrderModal(orderId);
            return;
    }
    
    if (newStatus) {
        await updateOrderStatus(orderId, newStatus);
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`/.netlify/functions/update-status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: orderId, status, cancelledBy: currentUser?.email })
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadOrders();
        } else {
            alert('Erro ao atualizar status: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Erro ao atualizar status. Tente novamente.');
    }
}

function openOrderModal(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const modal = document.getElementById('order-modal');
    const modalNumber = document.getElementById('modal-order-number');
    const modalDetails = document.getElementById('modal-order-details');
    const modalActions = document.getElementById('modal-actions');
    
    modalNumber.textContent = `Pedido #${order.order_number}`;
    
    modalDetails.innerHTML = `
        <div class="order-detail-section">
            <h3>Cliente</h3>
            <div class="order-detail-row">
                <span class="order-detail-label">Nome:</span>
                <span class="order-detail-value">${order.customer_name}</span>
            </div>
            ${order.customer_phone ? `
            <div class="order-detail-row">
                <span class="order-detail-label">Telefone:</span>
                <span class="order-detail-value">${order.customer_phone}</span>
            </div>
            ` : ''}
        </div>
        
        <div class="order-detail-section">
            <h3>Informações</h3>
            <div class="order-detail-row">
                <span class="order-detail-label">Horário:</span>
                <span class="order-detail-value">${formatDateTime(order.created_at)}</span>
            </div>
            <div class="order-detail-row">
                <span class="order-detail-label">Origem:</span>
                <span class="order-detail-value">${order.origin === 'kiosk' ? '📱 Kiosk' : '🌐 Online'}</span>
            </div>
            <div class="order-detail-row">
                <span class="order-detail-label">Status:</span>
                <span class="order-detail-value">${formatStatus(order.status)}</span>
            </div>
        </div>
        
        <div class="order-detail-section">
            <h3>Itens</h3>
            ${order.items.map(item => `
                <div class="order-item">
                    <div class="order-item-name">${item.product} (${item.size})</div>
                    ${item.addons && item.addons.length > 0 ? `
                    <div class="order-item-addons">+ ${item.addons.join(', ')}</div>
                    ` : ''}
                    ${item.notes ? `
                    <div class="order-item-addons">Obs: ${item.notes}</div>
                    ` : ''}
                    <div class="order-item-price">${formatCurrency(item.subtotalCents)}</div>
                </div>
            `).join('')}
        </div>
        
        ${order.notes ? `
        <div class="order-detail-section">
            <h3>Observações</h3>
            <div class="order-detail-row">
                <span class="order-detail-value">${order.notes}</span>
            </div>
        </div>
        ` : ''}
        
        <div class="order-detail-section">
            <h3>Pagamento</h3>
            <div class="order-detail-row">
                <span class="order-detail-label">Método:</span>
                <span class="order-detail-value">${order.payment_method === 'pix' ? '💠 Pix' : '💵 Dinheiro'}</span>
            </div>
            ${order.payment_details?.valorPago ? `
            <div class="order-detail-row">
                <span class="order-detail-label">Valor Pago:</span>
                <span class="order-detail-value">${formatCurrency(order.payment_details.valorPago * 100)}</span>
            </div>
            ` : ''}
        </div>
        
        <div class="order-detail-section">
            <h3>Total</h3>
            <div class="order-detail-row">
                <span class="order-detail-label">Valor Total:</span>
                <span class="order-detail-value" style="font-size: 1.5rem; color: #8e44ad;">${formatCurrency(order.total_cents)}</span>
            </div>
        </div>
    `;
    
    modalActions.innerHTML = getActionButtons(order);
    
    // Add event listeners to modal action buttons
    modalActions.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            handleAction(order.id, btn.dataset.action);
            closeModal();
        });
    });
    
    modal.classList.add('show');
}

function closeModal() {
    document.getElementById('order-modal').classList.remove('show');
}

function filterOrders() {
    renderOrders();
}

function filterOrdersList(ordersList) {
    const search = document.getElementById('search-input').value.toLowerCase();
    const status = document.getElementById('status-filter').value;
    const origin = document.getElementById('origin-filter').value;
    
    return ordersList.filter(order => {
        const matchSearch = !search || 
            order.order_number.toString().includes(search) ||
            order.customer_name.toLowerCase().includes(search);
        
        const matchStatus = !status || order.status === status;
        const matchOrigin = !origin || order.origin === origin;
        
        return matchSearch && matchStatus && matchOrigin;
    });
}

function updateStats() {
    const stats = {
        new: orders.filter(o => o.status === 'new').length,
        preparing: orders.filter(o => o.status === 'preparing').length,
        ready: orders.filter(o => o.status === 'ready').length,
        completed: orders.filter(o => o.status === 'completed').length
    };
    
    document.getElementById('stat-new').textContent = stats.new;
    document.getElementById('stat-preparing').textContent = stats.preparing;
    document.getElementById('stat-ready').textContent = stats.ready;
    document.getElementById('stat-completed').textContent = stats.completed;
}

function updateColumnCounts() {
    const columns = ['new', 'preparing', 'ready', 'completed'];
    columns.forEach(status => {
        const count = document.querySelectorAll(`#orders-${status} .order-card`).length;
        document.getElementById(`count-${status}`).textContent = count;
    });
}

function toggleHistory() {
    const historyContent = document.getElementById('history-content');
    const showBtn = document.getElementById('show-history-btn');
    
    if (historyContent.style.display === 'none') {
        historyContent.style.display = 'block';
        showBtn.textContent = 'Ocultar Histórico';
        loadHistory();
    } else {
        historyContent.style.display = 'none';
        showBtn.textContent = 'Ver Histórico';
    }
}

function loadHistory() {
    const tbody = document.getElementById('history-table-body');
    const completedOrders = orders.filter(o => 
        ['completed', 'cancelled'].includes(o.status)
    );
    
    tbody.innerHTML = completedOrders.map(order => `
        <tr>
            <td>#${order.order_number}</td>
            <td>${order.customer_name}</td>
            <td>${formatCurrency(order.total_cents)}</td>
            <td>${formatDateTime(order.created_at)}</td>
            <td><span class="status-badge ${order.status}">${formatStatus(order.status)}</span></td>
            <td>
                <button class="action-btn" onclick="openOrderModal('${order.id}')">Ver</button>
            </td>
        </tr>
    `).join('');
}

// Utility functions
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function formatCurrency(cents) {
    return (cents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatItems(items) {
    if (!items || items.length === 0) return '-';
    return items.map(item => `${item.quantity}x ${item.product}`).join(', ');
}

function formatStatus(status) {
    const statusMap = {
        'new': 'Novo',
        'preparing': 'Em Preparo',
        'ready': 'Pronto',
        'completed': 'Finalizado',
        'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
}

function playNotificationSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQA=');
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Audio play failed:', e));
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
