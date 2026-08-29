const { createClient } = require('@supabase/supabase-js');

// Inicializa cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Verifica se as variáveis de ambiente estão configuradas
if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente do Supabase não configuradas');
  console.error('SUPABASE_URL:', supabaseUrl ? 'Configurada' : 'Não configurada');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Configurada' : 'Não configurada');
}

// Remove /rest/v1/ se estiver presente na URL
const cleanSupabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '');

console.log('Supabase URL original:', supabaseUrl);
console.log('Supabase URL limpa:', cleanSupabaseUrl);

const supabase = createClient(cleanSupabaseUrl, supabaseKey);

exports.handler = async (event) => {
  // Apenas permite POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);

    // Validação básica
    if (!body.customerName || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Dados inválidos: customerName e items são obrigatórios' })
      };
    }

    // Valida e recalcula o total no backend
    let totalCents = 0;
    const validatedItems = body.items.map(item => {
      // Validação básica do item
      if (!item.product || !item.size || item.unitPrice === undefined) {
        throw new Error('Item inválido: product, size e unitPrice são obrigatórios');
      }

      // Converte preço para centavos
      const unitPriceCents = Math.round(item.unitPrice * 100);
      const subtotalCents = unitPriceCents * (item.quantity || 1);
      
      totalCents += subtotalCents;

      return {
        product: item.product,
        quantity: item.quantity || 1,
        size: item.size,
        addons: item.addons || [],
        notes: item.notes || '',
        unitPriceCents,
        subtotalCents
      };
    });

    // Compara com o total enviado (com margem de erro pequena para arredondamento)
    const sentTotalCents = Math.round(body.total * 100);
    if (Math.abs(totalCents - sentTotalCents) > 5) {
      console.warn(`Discrepância no total: enviado=${sentTotalCents}, calculado=${totalCents}`);
      // Usa o valor calculado no backend
    }

    // Gera próximo número de pedido (simplificado - usa timestamp)
    const orderNumber = Math.floor(Date.now() / 1000) % 10000;

    // Insere o pedido no banco
    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: body.customerName,
        customer_phone: body.customerPhone || null,
        items: validatedItems,
        total_cents: totalCents,
        payment_method: body.paymentMethod,
        payment_details: body.paymentDetails || null,
        origin: body.origin || 'kiosk',
        status: 'new',
        notes: body.notes || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir pedido:', insertError);
      console.error('Detalhes do erro:', JSON.stringify(insertError, null, 2));
      throw new Error(`Erro ao salvar pedido no banco: ${insertError.message}`);
    }

    // Retorna o pedido criado
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.order_number,
          customerName: order.customer_name,
          total: order.total_cents / 100,
          status: order.status,
          createdAt: order.created_at
        }
      })
    };

  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: false,
        error: error.message || 'Erro interno do servidor' 
      })
    };
  }
};
