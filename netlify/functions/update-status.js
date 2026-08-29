const { createClient } = require('@supabase/supabase-js');

// Inicializa cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  // Apenas permite PATCH
  if (event.httpMethod !== 'PATCH') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { id } = event.pathParameters;
    const body = JSON.parse(event.body);

    // Validação
    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'ID do pedido é obrigatório' })
      };
    }

    if (!body.status) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Status é obrigatório' })
      };
    }

    // Valida se o status é válido
    const validStatuses = ['new', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(body.status)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Status inválido' })
      };
    }

    // Prepara os dados para atualização
    const updateData = {
      status: body.status
    };

    // Se estiver cancelando, registra quem cancelou e quando
    if (body.status === 'cancelled') {
      updateData.cancelled_by = body.cancelledBy || null;
      updateData.cancelled_at = new Date().toISOString();
    }

    // Atualiza o pedido
    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar pedido:', error);
      throw new Error('Erro ao atualizar pedido no banco');
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
          total: order.total_cents / 100,
          status: order.status,
          updatedAt: order.updated_at,
          cancelledBy: order.cancelled_by,
          cancelledAt: order.cancelled_at
        }
      })
    };

  } catch (error) {
    console.error('Erro ao atualizar status:', error);
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
