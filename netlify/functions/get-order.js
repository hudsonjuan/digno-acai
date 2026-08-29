const { createClient } = require('@supabase/supabase-js');

// Inicializa cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  // Apenas permite GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { id } = event.pathParameters;

    // Validação
    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'ID do pedido é obrigatório' })
      };
    }

    // Busca o pedido
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar pedido:', error);
      throw new Error('Erro ao buscar pedido no banco');
    }

    if (!order) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Pedido não encontrado' })
      };
    }

    // Formata a resposta
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.order_number,
          customerName: order.customer_name,
          customerPhone: order.customer_phone,
          items: order.items,
          total: order.total_cents / 100,
          paymentMethod: order.payment_method,
          paymentDetails: order.payment_details,
          origin: order.origin,
          status: order.status,
          notes: order.notes,
          createdAt: order.created_at,
          updatedAt: order.updated_at,
          cancelledBy: order.cancelled_by,
          cancelledAt: order.cancelled_at
        }
      })
    };

  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
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
