-- Schema do Banco de Dados - Digno Açaí
-- PostgreSQL via Supabase

-- Habilita extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_number INTEGER UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    items JSONB NOT NULL,
    total_cents INTEGER NOT NULL, -- Valores em centavos para evitar erros de ponto flutuante
    payment_method TEXT NOT NULL, -- 'pix' ou 'dinheiro'
    payment_details JSONB, -- Detalhes como valor pago, troco, etc.
    origin TEXT NOT NULL, -- 'kiosk' ou 'online'
    status TEXT NOT NULL DEFAULT 'new', -- 'new', 'preparing', 'ready', 'completed', 'cancelled'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_by TEXT,
    cancelled_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_origin ON orders(origin);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Tabela para controle de sequência de números de pedido
CREATE TABLE IF NOT EXISTS order_sequence (
    id INTEGER PRIMARY KEY DEFAULT 1,
    next_number INTEGER NOT NULL DEFAULT 1
);

-- Inserir sequência inicial se não existir
INSERT INTO order_sequence (next_number)
SELECT 1
WHERE NOT EXISTS (SELECT 1 FROM order_sequence);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar próximo número de pedido
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS INTEGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    -- Bloquear a linha para evitar concorrência
    LOCK TABLE order_sequence IN ACCESS EXCLUSIVE MODE;
    
    -- Obter e incrementar o número
    UPDATE order_sequence
    SET next_number = next_number + 1
    RETURNING next_number - 1 INTO next_num;
    
    RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- Políticas de segurança (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção de pedidos (público para kiosk/online)
CREATE POLICY "Allow insert orders"
    ON orders
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Política para permitir leitura de pedidos (apenas autenticados para admin)
CREATE POLICY "Allow select orders for authenticated"
    ON orders
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para permitir atualização de status (apenas autenticados para admin)
CREATE POLICY "Allow update orders for authenticated"
    ON orders
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política para proteger sequência (apenas service role)
ALTER TABLE order_sequence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Protect order_sequence"
    ON order_sequence
    FOR ALL
    TO anon, authenticated
    USING (false);

-- View para pedidos ativos (não cancelados)
CREATE OR REPLACE VIEW active_orders AS
SELECT *
FROM orders
WHERE status != 'cancelled'
ORDER BY created_at DESC;
