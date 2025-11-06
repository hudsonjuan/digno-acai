// Configurações
const CONFIG = {
    whatsappNumber: '5598984425355', // Formato: 5511999999999 (código do país + DDD + número)
    maxToppings: Infinity // Removendo limite de complementos
};

// Elementos do DOM
const sizeButtons = document.querySelectorAll('.option-btn');
const toppingCheckboxes = document.querySelectorAll('input[name="topping"]');
const notesTextarea = document.getElementById('notes');
const totalPriceElement = document.getElementById('total-price');
const checkoutButton = document.getElementById('checkout-btn');
const modal = document.getElementById('modal');
const orderSummary = document.getElementById('order-summary');
const confirmButton = document.getElementById('confirm-btn');
const cancelButton = document.getElementById('cancel-btn');

// Estado do pedido
let order = {
    size: {
        name: '300ml',
        price: 14.00
    },
    frutas: [],
    sorvetes: [],
    toppings: [],
    notes: '',
    total: 14.00
};

// Inicialização
function init() {
    loadFromLocalStorage();
    setupEventListeners();
    updateUI();
}

// Configura os event listeners
function setupEventListeners() {
    // Seleção de tamanho
    sizeButtons.forEach(button => {
        button.addEventListener('click', () => selectSize(button));
    });

    // Seleção de frutas, sorvetes e complementos
    document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
        input.addEventListener('change', updateSelections);
    });

    // Observações
    notesTextarea.addEventListener('input', (e) => {
        order.notes = e.target.value;
        saveToLocalStorage();
    });

    // Botão de finalizar pedido
    checkoutButton.addEventListener('click', showOrderSummary);

    // Botões do modal
    confirmButton.addEventListener('click', sendOrder);
    cancelButton.addEventListener('click', () => {
        modal.classList.remove('show');
    });
}

// Seleciona o tamanho do açaí
function selectSize(selectedButton) {
    sizeButtons.forEach(button => button.classList.remove('active'));
    selectedButton.classList.add('active');
    
    order.size = {
        name: `${selectedButton.dataset.size}ml`,
        price: parseFloat(selectedButton.dataset.price)
    };
    
    updateTotal();
    saveToLocalStorage();
}

// Atualiza os itens selecionados
function updateSelections() {
    // Atualiza frutas selecionadas
    order.frutas = Array.from(document.querySelectorAll('input[name="fruta"]:checked'))
        .map(checkbox => checkbox.value);
    
    // Atualiza sorvetes selecionados
    order.sorvetes = Array.from(document.querySelectorAll('input[name="sorvete"]:checked'))
        .map(checkbox => checkbox.value);
    
    // Atualiza complementos selecionados
    order.toppings = Array.from(document.querySelectorAll('input[name="topping"]:checked'))
        .map(checkbox => checkbox.value);
    
    updateTotal();
    saveToLocalStorage();
}

// Atualiza o preço total
function updateTotal() {
    // O preço é baseado apenas no tamanho, os complementos são gratuitos
    order.total = order.size.price;
    totalPriceElement.textContent = `R$ ${order.total.toFixed(2).replace('.', ',')}`;
}

// Atualiza a interface do usuário
function updateUI() {
    // Atualiza o tamanho selecionado
    document.querySelectorAll('.option-btn').forEach(button => {
        if (button.dataset.size === order.size.name.replace('ml', '')) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Atualiza frutas selecionadas
    document.querySelectorAll('input[name="fruta"]').forEach(checkbox => {
        checkbox.checked = order.frutas.includes(checkbox.value);
    });
    
    // Atualiza sorvetes selecionados
    document.querySelectorAll('input[name="sorvete"]').forEach(checkbox => {
        checkbox.checked = order.sorvetes.includes(checkbox.value);
    });
    
    // Atualiza os complementos selecionados
    document.querySelectorAll('input[name="topping"]').forEach(checkbox => {
        checkbox.checked = order.toppings.includes(checkbox.value);
    });
    
    // Atualiza as observações
    notesTextarea.value = order.notes;
    
    // Atualiza o total
    updateTotal();
}

// Mostra o resumo do pedido no modal
function showOrderSummary() {
    let summaryHTML = `
        <div class="summary-item">
            <span>Tamanho:</span>
            <span>${order.size.name} (R$ ${order.size.price.toFixed(2).replace('.', ',')})</span>
        </div>`;
        
    if (order.frutas.length > 0) {
        summaryHTML += `
        <div class="summary-item">
            <span>Frutas:</span>
            <span>${order.frutas.join(', ')}</span>
        </div>`;
    }
    
    if (order.sorvetes.length > 0) {
        summaryHTML += `
        <div class="summary-item">
            <span>Sorvetes:</span>
            <span>${order.sorvetes.join(', ')}</span>
        </div>`;
    }
    
    if (order.toppings.length > 0) {
        summaryHTML += `
        <div class="summary-item">
            <span>Complementos:</span>
            <span>${order.toppings.join(', ')}</span>
        </div>`;
    }
    
    if (order.notes) {
        summaryHTML += `
        <div class="summary-item">
            <span>Observações:</span>
            <span>${order.notes}</span>
        </div>
        `;
    }
    
    summaryHTML += `
        <div class="summary-total">
            <span>Total:</span>
            <span>R$ ${order.total.toFixed(2).replace('.', ',')}</span>
        </div>
    `;
    
    orderSummary.innerHTML = summaryHTML;
    modal.classList.add('show');
}

// Envia o pedido para o WhatsApp
function sendOrder() {
    let message = `🍧 *NOVO PEDIDO - Digno Açaí* 🍧

*TAMANHO:* ${order.size.name} (R$ ${order.size.price.toFixed(2).replace('.', ',')})`;

    if (order.frutas.length > 0) {
        message += `\n*FRUTAS:* ${order.frutas.join(', ')}`;
    }
    
    if (order.sorvetes.length > 0) {
        message += `\n*SORVETES:* ${order.sorvetes.join(', ')}`;
    }

    if (order.toppings.length > 0) {
        message += `\n*COMPLEMENTOS:* ${order.toppings.join(', ')}`;
    }
    
    if (order.notes) {
        message += `\n*OBSERVAÇÕES:* ${order.notes}`;
    }
    
    message += `\n\n*TOTAL: R$ ${order.total.toFixed(2).replace('.', ',')}*`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/55${CONFIG.whatsappNumber}?text=${encodedMessage}`;
    
    // Abre o WhatsApp
    window.open(whatsappUrl, '_blank');
    
    // Fecha o modal
    modal.classList.remove('show');
    
    // Limpa o carrinho (opcional)
    // resetOrder();
}

// Reseta o pedido
function resetOrder() {
    order = {
        size: {
            name: '300ml',
            price: 14.00
        },
        frutas: [],
        sorvetes: [],
        toppings: [],
        notes: '',
        total: 14.00
    };
    
    localStorage.removeItem('acaiOrder');
    updateUI();
}

// Salva o pedido no localStorage
function saveToLocalStorage() {
    localStorage.setItem('acaiOrder', JSON.stringify(order));
}

// Carrega o pedido do localStorage
function loadFromLocalStorage() {
    const savedOrder = localStorage.getItem('acaiOrder');
    if (savedOrder) {
        try {
            const parsedOrder = JSON.parse(savedOrder);
            // Garante que todos os campos necessários existam
            order = {
                size: parsedOrder.size || { name: '500ml', price: 15.00 },
                toppings: Array.isArray(parsedOrder.toppings) ? parsedOrder.toppings : [],
                notes: parsedOrder.notes || '',
                total: parsedOrder.total || 15.00
            };
        } catch (e) {
            console.error('Erro ao carregar pedido salvo:', e);
        }
    }
}

// Inicializa o aplicativo
window.addEventListener('DOMContentLoaded', init);
