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
    const queryParams = event.queryStringParameters || {};
    
    // Parâmetros de filtro
    const status = queryParams.status;
    const origin = queryParams.origin;
    const limit = parseInt(queryParams.limit) || 50;
    const offset = parseInt(queryParams.offset) || 0;

    // Constrói a query
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Aplica filtros se fornecidos
    if (status) {
      query = query.eq('status', status);
    }
    
    if (origin) {
      query = query.eq('origin', origin);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Erro ao buscar pedidos:', error);
      throw new Error('Erro ao buscar pedidos no banco');
    }

    // Formata os dados para o frontend
    const formattedOrders = orders.map(order => ({
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
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        orders: formattedOrders,
        count: formattedOrders.length
      })
    };

  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
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
