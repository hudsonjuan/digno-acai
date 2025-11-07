// Configurações
const CONFIG = {
    whatsappNumber: '5598984425355',
    maxToppings: Infinity,
    prices: {
        frutaAdicional: 1.00,    // R$ 1,00 por fruta adicional (acima de 2)
        sorveteAdicional: 2.00   // R$ 2,00 por sorvete adicional (acima de 1)
    }
};

// Elementos do DOM
const sizeButtons = document.querySelectorAll('.option-btn');
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
    total: 14.00,
    extras: {
        frutasAdicionais: 0,
        sorvetesAdicionais: 0
    }
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
        button.addEventListener('click', (e) => {
            e.preventDefault();
            selectSize(button);
        });
    });

    // Seleção de frutas
    document.querySelectorAll('input[name="fruta"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateFrutas);
    });

    // Seleção de sorvetes
    document.querySelectorAll('input[name="sorvete"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateSorvetes);
    });

    // Seleção de caldas (apenas uma seleção permitida)
    const caldas = document.querySelectorAll('input[name="topping"][value^="Calda"], input[name="topping"][value^="Leite Condensado"]');
    caldas.forEach(calda => {
        calda.addEventListener('change', updateCaldas);
    });

    // Outros complementos
    document.querySelectorAll('input[name="topping"]:not([value^="Calda"]):not([value^="Leite Condensado"])').forEach(checkbox => {
        checkbox.addEventListener('change', updateToppings);
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

// Atualiza a seleção de frutas
function updateFrutas(event) {
    const frutasCheckboxes = Array.from(document.querySelectorAll('input[name="fruta"]:checked'));
    order.frutas = frutasCheckboxes.map(checkbox => checkbox.value);
    
    // Calcula frutas adicionais (acima de 2)
    order.extras.frutasAdicionais = Math.max(0, order.frutas.length - 2);
    
    updateTotal();
    updateVisualHints();
    saveToLocalStorage();
}

// Atualiza a seleção de sorvetes
function updateSorvetes(event) {
    const sorvetesCheckboxes = Array.from(document.querySelectorAll('input[name="sorvete"]:checked'));
    order.sorvetes = sorvetesCheckboxes.map(checkbox => checkbox.value);
    
    // Calcula sorvetes adicionais (acima de 1)
    order.extras.sorvetesAdicionais = Math.max(0, order.sorvetes.length - 1);
    
    updateTotal();
    updateVisualHints();
    saveToLocalStorage();
}

// Atualiza a seleção de caldas (apenas uma seleção permitida)
function updateCaldas(event) {
    const caldas = document.querySelectorAll('input[name="topping"][value^="Calda"], input[name="topping"][value^="Leite Condensado"]');
    
    // Se estiver marcando uma nova calda
    if (event.target.checked) {
        // Desmarca outras caldas
        caldas.forEach(calda => {
            if (calda !== event.target) {
                calda.checked = false;
            }
        });
        
        // Adiciona a calda selecionada
        const caldaSelecionada = event.target.value;
        order.toppings = order.toppings.filter(t => !['Leite Condensado', 'Calda de Chocolate', 'Calda de Morango'].includes(t));
        order.toppings.push(caldaSelecionada);
    } else {
        // Se estiver desmarcando a calda atual
        order.toppings = order.toppings.filter(t => t !== event.target.value);
    }
    
    updateTotal();
    saveToLocalStorage();
}

// Atualiza outros complementos (não caldas)
function updateToppings(event) {
    const topping = event.target.value;
    
    if (event.target.checked) {
        if (!order.toppings.includes(topping)) {
            order.toppings.push(topping);
        }
    } else {
        order.toppings = order.toppings.filter(t => t !== topping);
    }
    
    updateTotal();
    saveToLocalStorage();
}

// Atualiza o preço total
function updateTotal() {
    // Preço base é o preço do tamanho selecionado
    let total = order.size.price;
    
    // Adiciona valor das frutas adicionais (acima de 2)
    total += order.extras.frutasAdicionais * CONFIG.prices.frutaAdicional;
    
    // Adiciona valor dos sorvetes adicionais (acima de 1)
    total += order.extras.sorvetesAdicionais * CONFIG.prices.sorveteAdicional;
    
    // Atualiza o total do pedido
    order.total = parseFloat(total.toFixed(2));
    
    // Atualiza o elemento de preço total na interface
    totalPriceElement.textContent = `R$ ${order.total.toFixed(2).replace('.', ',')}`;
}

// Atualiza dicas visuais para frutas e sorvetes
function updateVisualHints() {
    // Atualiza dicas visuais para frutas
    const frutasSelecionadas = order.frutas.length;
    const frutasInfo = document.querySelector('h3:contains("Frutas")').nextElementSibling;
    
    if (frutasSelecionadas > 2) {
        frutasInfo.textContent = `Até 2 frutas inclusas. +R$ ${(frutasSelecionadas - 2) * CONFIG.prices.frutaAdicional} em frutas adicionais.`;
        frutasInfo.style.color = '#e74c3c';
    } else {
        frutasInfo.textContent = 'Até 2 frutas inclusas. R$ 1,00 por fruta adicional.';
        frutasInfo.style.color = '';
    }
    
    // Atualiza dicas visuais para sorvetes
    const sorvetesSelecionados = order.sorvetes.length;
    const sorvetesInfo = document.querySelector('h3:contains("Sorvetes")').nextElementSibling;
    
    if (sorvetesSelecionados > 1) {
        sorvetesInfo.textContent = `1 incluso. +R$ ${(sorvetesSelecionados - 1) * CONFIG.prices.sorveteAdicional} em sorvetes adicionais.`;
        sorvetesInfo.style.color = '#e74c3c';
    } else {
        sorvetesInfo.textContent = '1 incluso. R$ 2,00 por adicional.';
        sorvetesInfo.style.color = '';
    }
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
    
    // Atualiza os contadores de adicionais
    order.extras.frutasAdicionais = Math.max(0, order.frutas.length - 2);
    order.extras.sorvetesAdicionais = Math.max(0, order.sorvetes.length - 1);
    
    // Atualiza o total e as dicas visuais
    updateTotal();
    updateVisualHints();
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
            
            // Carrega os dados básicos
            order = {
                size: parsedOrder.size || { name: '300ml', price: 14.00 },
                frutas: Array.isArray(parsedOrder.frutas) ? parsedOrder.frutas : [],
                sorvetes: Array.isArray(parsedOrder.sorvetes) ? parsedOrder.sorvetes : [],
                toppings: Array.isArray(parsedOrder.toppings) ? parsedOrder.toppings : [],
                notes: parsedOrder.notes || '',
                total: parsedOrder.total || 14.00,
                extras: {
                    frutasAdicionais: 0,
                    sorvetesAdicionais: 0
                }
            };
            
            // Atualiza os contadores de adicionais
            order.extras.frutasAdicionais = Math.max(0, order.frutas.length - 2);
            order.extras.sorvetesAdicionais = Math.max(0, order.sorvetes.length - 1);
            
        } catch (e) {
            console.error('Erro ao carregar pedido salvo:', e);
        }
    }
}

// Inicializa o aplicativo
window.addEventListener('DOMContentLoaded', init);
