// Configurações
const CONFIG = {
    whatsappNumber: '5598985780249',
    maxToppings: 3,
    maxCaldas: 2,
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
        name: '300 ml',
        price: 14.00
    },
    frutas: [],
    sorvetes: [],
    caldas: [],
    toppings: [],
    notes: '',
    total: 14.00,
    formaPagamento: null,
    trocoPara: null,
    extras: {
        frutasAdicionais: 0,
        sorvetesAdicionais: 0
    },
    payment: {
        method: null,
        valorPago: null
    }
};

// Expose order globally for kiosk mode
window.order = order;

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
    
    // Botão de finalizar pedido
    checkoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Mostra o modal de pagamento primeiro
        showPaymentMethodModal();
    });

    // Seleção de frutas
    document.querySelectorAll('input[name="fruta"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateFrutas);
    });

    // Seleção de sorvetes
    document.querySelectorAll('input[name="sorvete"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateSorvetes);
    });

    // Seleção de caldas com limite de 2
    document.querySelectorAll('input[name="calda"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateCaldas);
    });

    // Seleção de toppings (acompanhamentos) com limite de 3
    document.querySelectorAll('input[name="topping"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateToppings);
    });

    // Observações
    notesTextarea.addEventListener('input', (e) => {
        order.notes = e.target.value;
        saveToLocalStorage();
    });

    // Botões do modal de confirmação do pedido
    const confirmOrderBtn = document.getElementById('confirm-order');
    if (confirmOrderBtn) {
        confirmOrderBtn.addEventListener('click', showPaymentMethodModal);
    }
    document.getElementById('cancel-order').addEventListener('click', () => {
        document.getElementById('order-confirm-modal').classList.remove('show');
    });
}

// Seleciona o tamanho do açaí
function selectSize(selectedButton) {
    sizeButtons.forEach(button => button.classList.remove('active'));
    selectedButton.classList.add('active');
    
    // Atualiza o tamanho e preço do pedido
    order.size = {
        name: selectedButton.dataset.size === 'barca' ? 'Barca de Açaí' : `${selectedButton.dataset.size}ml`,
        price: parseFloat(selectedButton.dataset.price)
    };
    
    // Atualiza o total e a interface do usuário
    updateTotal();
    updateUI();
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

// Atualiza a seleção de caldas
function updateCaldas(event) {
    const caldasCheckboxes = Array.from(document.querySelectorAll('input[name="calda"]:checked'));
    
    // Se está desmarcando, permite sempre
    if (event && !event.target.checked) {
        order.caldas = caldasCheckboxes.map(checkbox => checkbox.value);
        updateTotal();
        saveToLocalStorage();
        return;
    }
    
    // Se está marcando, verifica o limite
    if (order.caldas.length >= CONFIG.maxCaldas) {
        event.target.checked = false;
        return;
    }
    
    order.caldas = caldasCheckboxes.map(checkbox => checkbox.value);
    updateTotal();
    saveToLocalStorage();
}

// Atualiza outros complementos (não caldas)
function updateToppings(event) {
    const topping = event.target.value;
    
    // Se está desmarcando, permite sempre
    if (!event.target.checked) {
        order.toppings = order.toppings.filter(t => t !== topping);
        updateTotal();
        saveToLocalStorage();
        return;
    }
    
    // Filtra apenas acompanhamentos (não caldas)
    const isCalda = ['Leite condensado', 'Chocolate', 'Morango', 'Uva', 'Babalu'].includes(topping);
    
    if (!isCalda) {
        const acompanhamentosAtuais = order.toppings.filter(t => 
            !['Leite condensado', 'Chocolate', 'Morango', 'Uva', 'Babalu'].includes(t)
        );
        
        if (acompanhamentosAtuais.length >= CONFIG.maxToppings) {
            event.target.checked = false;
            return;
        }
    } else {
        // Limita caldas a 2
        const caldasAtuais = order.toppings.filter(t => 
            ['Leite condensado', 'Chocolate', 'Morango', 'Uva', 'Babalu'].includes(t)
        );
        
        if (caldasAtuais.length >= CONFIG.maxCaldas) {
            event.target.checked = false;
            return;
        }
    }
    
    if (!order.toppings.includes(topping)) {
        order.toppings.push(topping);
    }
    
    updateTotal();
    saveToLocalStorage();
}

// Atualiza o preço total
function updateTotal() {
    // Preço base é o preço do tamanho selecionado
    let total = order.size ? order.size.price : 0;
    
    // Adiciona valor das frutas adicionais (acima de 2)
    total += (order.extras?.frutasAdicionais || 0) * CONFIG.prices.frutaAdicional;
    
    // Adiciona valor dos sorvetes adicionais (acima de 1)
    total += (order.extras?.sorvetesAdicionais || 0) * CONFIG.prices.sorveteAdicional;
    
    // Atualiza o total do pedido
    order.total = parseFloat(total.toFixed(2));
    
    // Atualiza o elemento de preço total na interface
    if (totalPriceElement) {
        totalPriceElement.textContent = `R$ ${order.total.toFixed(2).replace('.', ',')}`;
    }
    
    return order.total;
}

// Atualiza dicas visuais para frutas e sorvetes
function updateVisualHints() {
    // Atualiza dicas visuais para frutas
    const frutasSelecionadas = order.frutas.length;
    const frutasInfo = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('Frutas'))?.nextElementSibling;
    
    if (frutasInfo) {
        if (frutasSelecionadas > 2) {
            frutasInfo.textContent = `Até 2 frutas inclusas. +R$ ${(frutasSelecionadas - 2) * CONFIG.prices.frutaAdicional} em frutas adicionais.`;
            frutasInfo.style.color = '#e74c3c';
        } else {
            frutasInfo.textContent = 'Até 2 frutas inclusas. R$ 1,00 por fruta adicional.';
            frutasInfo.style.color = '';
        }
    }
    
    // Sorvetes não têm mais dicas visuais
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
    
    // Atualiza caldas selecionadas
    document.querySelectorAll('input[name="calda"]').forEach(checkbox => {
        checkbox.checked = order.caldas.includes(checkbox.value);
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

// Mostra o modal de seleção de pagamento
function showPaymentMethodModal() {
    const paymentModal = document.getElementById('payment-method-modal');
    const paymentOptions = document.querySelectorAll('.payment-option');
    const confirmPaymentBtn = document.getElementById('confirm-payment');
    const cancelPaymentBtn = document.getElementById('cancel-payment');
    const trocoInput = document.getElementById('troco-para');
    
    // Reset payment selection
    paymentOptions.forEach(option => {
        option.classList.remove('selected');
        const method = option.dataset.method;
        const details = option.querySelector(`.pix-details, .troco-input`);
        if (details) details.style.display = 'none';
    });
    
    // Show payment modal
    paymentModal.classList.add('show');
    
    // Handle payment option selection
    paymentOptions.forEach(option => {
        option.addEventListener('click', () => {
            const method = option.dataset.method;
            
            // Update UI
            paymentOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            
            // Show/hide details based on selection
            if (method === 'pix') {
                document.querySelector('.pix-details').style.display = 'block';
                const trocoInput = document.querySelector('.troco-input');
                if (trocoInput) trocoInput.style.display = 'none';
            } else if (method === 'dinheiro') {
                const pixDetails = document.querySelector('.pix-details');
                if (pixDetails) pixDetails.style.display = 'none';
                document.querySelector('.troco-input').style.display = 'block';
            }
            
            // Enable confirm button
            confirmPaymentBtn.disabled = false;
        });
    });
    
    // Handle confirm payment
    confirmPaymentBtn.addEventListener('click', async () => {
        console.log('Confirm button clicked'); // Debug log
        const selectedOption = document.querySelector('.payment-option.selected');
        if (!selectedOption) {
            alert('Escolha uma forma de pagamento para continuar.');
            return;
        }
        
        const method = selectedOption.dataset.method;
        order.payment = order.payment || {};
        order.payment.method = method;
        
        if (method === 'dinheiro') {
            const valorPago = parseFloat(trocoInput.value);
            if (isNaN(valorPago) || valorPago < order.total) {
                alert(`Por favor, informe um valor igual ou maior que R$ ${order.total.toFixed(2).replace('.', ',')}`);
                return;
            }
            order.payment.valorPago = valorPago;
        } else {
            order.payment.valorPago = null;
        }
        
        // Salva o pedido
        saveToLocalStorage();
        
        // Fecha o modal de pagamento
        paymentModal.classList.remove('show');
        
        // Verifica se está em modo kiosk
        const isKioskMode = new URLSearchParams(window.location.search).get('kiosk') === '1' || new URLSearchParams(window.location.search).get('kiosk') === 'true';
        
        if (isKioskMode) {
            // Em modo kiosk, chama a função do kiosk-mode.js
            console.log('Kiosk mode detected - calling kioskSendOrder');
            if (typeof window.kioskSendOrder === 'function') {
                await window.kioskSendOrder();
            } else {
                console.error('Kiosk mode: kioskSendOrder function not found!');
                alert('Erro ao enviar pedido. Tente novamente.');
            }
        } else {
            // Prepara e envia a mensagem para o WhatsApp (modo normal)
            const message = buildOrderMessage();
            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://wa.me/55${CONFIG.whatsappNumber}?text=${encodedMessage}`;
            
            console.log('Opening WhatsApp with URL:', whatsappUrl); // Debug log
            window.open(whatsappUrl, '_blank');
        }
        
        // Fecha o modal de confirmação se estiver aberto
        const confirmModal = document.getElementById('order-confirm-modal');
        if (confirmModal) {
            confirmModal.classList.remove('show');
        }
    });
    
    // Handle cancel payment
    cancelPaymentBtn.addEventListener('click', () => {
        paymentModal.classList.remove('show');
    });
    
    // Disable confirm button initially
    confirmPaymentBtn.disabled = true;
}

// Mostra o resumo do pedido no modal
function showOrderSummary(fromPayment = false) {
    // Se não veio do pagamento e não tem método de pagamento, mostra o modal de pagamento
    if (!fromPayment && !order.payment.method) {
        showPaymentMethodModal();
        return false;
    }
    
    // Se veio do pagamento mas não tem método, não faz nada
    if (fromPayment && !order.payment.method) {
        return false;
    }
    
    // Fecha o modal de pagamento se estiver aberto
    const paymentModal = document.getElementById('payment-method-modal');
    if (paymentModal) {
        paymentModal.classList.remove('show');
    }
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

// Constrói a mensagem do pedido
function buildOrderMessage() {
    // Verifica se o método de pagamento foi selecionado
    if (!order.payment || !order.payment.method) {
        throw new Error('Método de pagamento não selecionado');
    }

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
    
    // Adiciona informações de pagamento
    message += `\n\n💳 *FORMA DE PAGAMENTO:* ${order.payment.method === 'pix' ? 'PIX' : 'DINHEIRO'}`;
    
    if (order.payment.method === 'pix') {
        message += '\n🔑 Chave Pix(CPF): 10787807303';
    } else if (order.payment.method === 'dinheiro') {
        if (order.payment.valorPago) {
            message += `\n💰 Valor a ser pago: R$ ${order.payment.valorPago.toFixed(2).replace('.', ',')}`;
            const troco = order.payment.valorPago - order.total;
            if (troco > 0) {
                message += `\n💵 Troco: R$ ${troco.toFixed(2).replace('.', ',')}`;
            }
        }
    }
    
    // Adiciona o total
    message += `\n\n💰 *TOTAL: R$ ${order.total.toFixed(2).replace('.', ',')}*`;
    
    // Adiciona instruções finais
    message += '\n\n✅ *PEDIDO CONFIRMADO*';
    message += '\nAguarde a confirmação do estabelecimento.';
    
    
return message;
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
                caldas: Array.isArray(parsedOrder.caldas) ? parsedOrder.caldas : [],
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

// Função para esconder a splash screen
function hideSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        splashScreen.classList.add('fade-out');
        
        // Remove a splash screen do DOM após a animação
        setTimeout(() => {
            splashScreen.remove();
        }, 500); // Tempo da transição
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Esconde a splash screen após 2 segundos
    setTimeout(hideSplashScreen, 2000);
    // Info banner animation
    function animateInfoBanner() {
        const messages = document.querySelectorAll('.info-message');
        let current = 0;
                
        setInterval(() => {
            // Fade out current message
            messages[current].classList.remove('active');
                    
            // Move to next message
            current = (current + 1) % messages.length;
                    
            // Fade in next message
            setTimeout(() => {
                messages[current].classList.add('active');
            }, 500);
                    
        }, 3000); // Change message every 3 seconds
    }
                
    // Start the animation
    animateInfoBanner();
    init();
});
