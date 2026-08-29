# Digno Açaí 🍧

Sistema completo de pedidos para a Digno Açaí, incluindo pedidos online, modo kiosk para tablets e painel administrativo em tempo real.

## 🎯 Funcionalidades

### Site Público
- Montagem personalizada de açaí
- Múltiplos tamanhos (200ml a Barca)
- Frutas, sorvetes, complementos e caldas
- Cálculo automático de preços
- Pagamento via Pix ou Dinheiro
- Envio do pedido para WhatsApp

### Modo Kiosk (Tablet)
- Interface otimizada para tablets
- Solicitação de nome do cliente
- Bloqueio de scroll, zoom e seleção de texto
- Reset automático por inatividade (90s)
- Envio de pedidos para banco de dados
- Geração automática de número do pedido
- Confirmação na tela após finalização

### Painel Administrativo
- Dashboard em tempo real
- Visualização Kanban de pedidos
- Atualização automática (polling a cada 5s)
- Notificação sonora para novos pedidos
- Ações rápidas (Aceitar, Preparar, Pronto, Finalizar, Cancelar)
- Histórico de pedidos
- Filtros por status, origem e busca
- Detalhes completos de cada pedido

## 🚀 Tecnologias

### Frontend
- HTML5
- CSS3
- JavaScript puro (Vanilla JS)
- PWA (Progressive Web App)

### Backend
- Netlify Functions (Serverless)
- Supabase (PostgreSQL)
- Supabase Realtime (para futuras melhorias)

### Hospedagem
- Netlify (Frontend + Functions)
- Supabase (Banco de dados)

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ (para desenvolvimento local)
- Conta no Supabase
- Conta no Netlify

### 1. Clone o repositório

```bash
git clone https://github.com/hudsonjuan/digno-acai.git
cd digno-acai
```

### 2. Configure o Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Vá em SQL Editor e execute o script `supabase/schema.sql`
3. Copie as credenciais do seu projeto:
   - Project URL
   - anon public key
   - service_role key

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Instale as dependências

```bash
npm install
```

### 5. Execute localmente

```bash
npm run dev
```

Acesse:
- Site: http://localhost:8888
- Kiosk: http://localhost:8888?kiosk=1
- Admin: http://localhost:8888/admin.html

## 🌐 Deploy na Netlify

### 1. Conecte o repositório

1. Crie um site no [Netlify](https://netlify.com)
2. Conecte com o repositório GitHub
3. Configure o build command: `npm run build`
4. Configure o publish directory: `.` (raiz)

### 2. Configure as variáveis de ambiente

No painel da Netlify, vá em:
Site settings → Environment variables

Adicione as variáveis:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. Deploy

O Netlify fará o deploy automaticamente após cada push para o branch principal.

## 📱 URLs de Acesso

Após o deploy:

- **Site Público**: `https://seu-site.netlify.app`
- **Modo Kiosk**: `https://seu-site.netlify.app?kiosk=1`
- **Painel Admin**: `https://seu-site.netlify.app/admin.html`

## 🔐 Autenticação do Painel

### Credenciais Padrão

- **Email**: `admin@dignoacai.com`
- **Senha**: `admin123`

⚠️ **Importante**: Altere estas credenciais em produção implementando Supabase Auth.

### Como alterar a autenticação

Para implementar autenticação segura com Supabase Auth:

1. Habilite o Email Auth no Supabase
2. Crie um usuário admin no painel do Supabase
3. Modifique a função `handleLogin` em `admin.js` para usar `supabase.auth.signInWithPassword()`

## 📊 Estrutura do Banco de Dados

### Tabela `orders`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | ID único do pedido |
| order_number | INTEGER | Número do pedido (sequencial) |
| customer_name | TEXT | Nome do cliente |
| customer_phone | TEXT | Telefone do cliente (opcional) |
| items | JSONB | Itens do pedido |
| total_cents | INTEGER | Total em centavos |
| payment_method | TEXT | Método de pagamento (pix/dinheiro) |
| payment_details | JSONB | Detalhes do pagamento |
| origin | TEXT | Origem (kiosk/online) |
| status | TEXT | Status (new/preparing/ready/completed/cancelled) |
| notes | TEXT | Observações |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Data de atualização |
| cancelled_by | TEXT | Quem cancelou |
| cancelled_at | TIMESTAMPTZ | Data do cancelamento |

### Status dos Pedidos

- `new` - Novo pedido
- `preparing` - Em preparo
- `ready` - Pronto para entrega
- `completed` - Finalizado
- `cancelled` - Cancelado

## 🔧 API Endpoints

### POST `/.netlify/functions/create-order`
Cria um novo pedido.

**Body:**
```json
{
  "customerName": "João Silva",
  "customerPhone": "5598987654321",
  "items": [{
    "product": "Açaí 500ml",
    "quantity": 1,
    "size": "500ml",
    "addons": ["Leite Ninho", "Morango"],
    "notes": "Sem granola",
    "unitPrice": 18.00
  }],
  "total": 18.00,
  "paymentMethod": "pix",
  "paymentDetails": null,
  "origin": "kiosk",
  "notes": "Pedido para viagem"
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "uuid",
    "orderNumber": 42,
    "customerName": "João Silva",
    "total": 18.00,
    "status": "new",
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
```

### GET `/.netlify/functions/get-orders`
Lista todos os pedidos.

**Query Parameters:**
- `status`: Filtra por status (opcional)
- `origin`: Filtra por origem (opcional)
- `limit`: Limite de resultados (padrão: 50)
- `offset`: Offset para paginação (padrão: 0)

### GET `/.netlify/functions/get-order/:id`
Obtém detalhes de um pedido específico.

### PATCH `/.netlify/functions/update-status/:id`
Atualiza o status de um pedido.

**Body:**
```json
{
  "status": "preparing",
  "cancelledBy": "admin@dignoacai.com"
}
```

## 🔄 Fluxo do Sistema

### Kiosk (Tablet)
```
Cliente → ?kiosk=1
  ↓
Nome do cliente
  ↓
Monta pedido
  ↓
Finaliza
  ↓
API (create-order)
  ↓
Banco (Supabase)
  ↓
Número do pedido (#042)
  ↓
Confirmação na tela
  ↓
Reset completo
```

### Admin (Painel)
```
Admin → /admin.html
  ↓
Login
  ↓
Dashboard em tempo real
  ↓
Novos pedidos aparecem automaticamente
  ↓
Ações: Aceitar → Preparando → Pronto → Finalizar
```

### Online (Preservado)
```
Cliente → Site normal
  ↓
Monta pedido
  ↓
Finaliza
  ↓
WhatsApp (mantido)
```

## 🧪 Testes

### Testar o Kiosk
1. Acesse `http://localhost:8888?kiosk=1`
2. Digite seu nome
3. Monte um pedido completo
4. Finalize o pedido
5. Verifique se aparece no painel admin
6. Confirme o número do pedido
7. Verifique se o tablet foi resetado

### Testar o Admin
1. Acesse `http://localhost:8888/admin.html`
2. Faça login com as credenciais
3. Verifique se os pedidos aparecem
4. Teste as ações (Aceitar, Preparar, Pronto, Finalizar)
5. Teste os filtros e busca
6. Verifique o histórico

### Testar Sincronização
1. Abra o Kiosk em um navegador
2. Abra o Admin em outro
3. Crie um pedido no Kiosk
4. Confirme que aparece no Admin sem F5

### Testar Concorrência
1. Crie dois pedidos simultaneamente
2. Confirme que os números não se repetem

## 🐛 Troubleshooting

### Pedidos não aparecem no Admin
- Verifique se as variáveis de ambiente estão configuradas
- Verifique se o schema do banco foi executado
- Verifique o console do navegador para erros

### Erro ao criar pedido
- Verifique se a API está funcionando
- Verifique as credenciais do Supabase
- Verifique o console para erros de rede

### Kiosk não reseta
- Verifique se o `kiosk-mode.js` está sendo carregado
- Verifique o console para erros de JavaScript

## 📝 Próximos Passos

- [ ] Implementar Supabase Auth para autenticação segura
- [ ] Adicionar Supabase Realtime para atualizações em tempo real
- [ ] Criar sistema de impressão de comandas
- [ ] Adicionar relatórios e estatísticas
- [ ] Implementar sistema de funcionários
- [ ] Adicionar integração com gateway de pagamento
- [ ] Criar app mobile nativo

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

MIT

## 👨‍💻 Desenvolvido por

Hudson Juan © 2025
