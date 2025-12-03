# Arquitetura do Sistema de Notificações Visuais por Designer

## 1. ESTRUTURA DE DADOS (BACKEND)

### 1.1. Tabela no Banco de Dados

**Tabela: `designer_notifications`**

```sql
CREATE TABLE designer_notifications (
  id VARCHAR(255) PRIMARY KEY,
  designer_id VARCHAR(255) NOT NULL,
  type ENUM('common', 'important', 'urgent') NOT NULL DEFAULT 'common',
  h1 VARCHAR(500) NULL,
  h2 VARCHAR(500) NULL,
  h3 TEXT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (designer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_designer_id (designer_id),
  INDEX idx_enabled (enabled)
);
```

**Campos:**
- `id`: Identificador único (UUID ou similar)
- `designer_id`: ID do designer (FK para users)
- `type`: Tipo de alerta ('common', 'important', 'urgent')
- `h1`: Título principal (opcional, max 500 chars)
- `h2`: Subtítulo (opcional, max 500 chars)
- `h3`: Descrição completa (opcional, TEXT)
- `enabled`: Ativo/Inativo (boolean)
- `created_at`: Data de criação
- `updated_at`: Data da última atualização

**Regras de Negócio:**
- Um designer pode ter apenas UMA notificação ativa por vez
- Quando uma nova notificação é criada para um designer que já tem uma, a anterior é desativada automaticamente (ou pode ser substituída)
- Alternativa: Permitir múltiplas notificações por designer (mais flexível)

### 1.2. Modelo de Dados (TypeScript)

**Arquivo: `types.ts`**

```typescript
export type NotificationType = 'common' | 'important' | 'urgent';

export interface DesignerNotification {
  id: string;
  designerId: string;
  designerName?: string; // Para exibição no ADM
  type: NotificationType;
  h1?: string;
  h2?: string;
  h3?: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}
```

---

## 2. ENDPOINTS DA API (BACKEND)

### 2.1. Estrutura Base

**Base URL:** `/api/designer-notifications`

### 2.2. Endpoints Detalhados

#### **GET `/api/designer-notifications`**
- **Descrição:** Lista todas as notificações (para painel ADM)
- **Query Params:** 
  - `designerId` (opcional): Filtrar por designer específico
  - `enabled` (opcional): Filtrar por status (true/false)
- **Resposta:**
  ```json
  [
    {
      "id": "notif-123",
      "designerId": "user-456",
      "designerName": "João Silva",
      "type": "important",
      "h1": "Atenção Importante",
      "h2": "Nova atualização disponível",
      "h3": "Verifique as novas diretrizes...",
      "enabled": true,
      "createdAt": 1234567890,
      "updatedAt": 1234567890
    }
  ]
  ```

#### **GET `/api/designer-notifications/designer/:designerId`**
- **Descrição:** Busca notificação ativa de um designer específico
- **Resposta:**
  ```json
  {
    "id": "notif-123",
    "designerId": "user-456",
    "type": "important",
    "h1": "Atenção Importante",
    "h2": "Nova atualização disponível",
    "h3": "Verifique as novas diretrizes...",
    "enabled": true,
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  }
  ```
- **Status:** 404 se não houver notificação

#### **POST `/api/designer-notifications`**
- **Descrição:** Cria uma nova notificação para um designer
- **Body:**
  ```json
  {
    "designerId": "user-456",
    "type": "important",
    "h1": "Atenção Importante",
    "h2": "Nova atualização disponível",
    "h3": "Verifique as novas diretrizes...",
    "enabled": true
  }
  ```
- **Resposta:** Objeto `DesignerNotification` criado
- **Validação:**
  - `designerId` obrigatório
  - `type` deve ser 'common', 'important' ou 'urgent'
  - Pelo menos um campo de conteúdo (h1, h2 ou h3) deve estar preenchido

#### **PUT `/api/designer-notifications/:id`**
- **Descrição:** Atualiza uma notificação existente
- **Body:** Mesmo formato do POST (todos os campos opcionais)
- **Resposta:** Objeto `DesignerNotification` atualizado

#### **PATCH `/api/designer-notifications/:id/toggle`**
- **Descrição:** Ativa/desativa uma notificação (toggle)
- **Body:**
  ```json
  {
    "enabled": true
  }
  ```
- **Resposta:** Objeto `DesignerNotification` atualizado

#### **DELETE `/api/designer-notifications/:id`**
- **Descrição:** Remove uma notificação permanentemente
- **Resposta:** 204 No Content

---

## 3. ESTRUTURA DE ARQUIVOS (FRONTEND)

### 3.1. Organização de Arquivos

```
src/
├── types/
│   └── notification.ts          # Tipos TypeScript para notificações
│
├── context/
│   └── NotificationContext.tsx  # Context para gerenciar notificações
│
├── services/
│   └── notificationService.ts   # Funções de API (fetch)
│
├── components/
│   ├── notifications/
│   │   ├── NotificationBadge.tsx        # Badge visual no header do designer
│   │   ├── NotificationTooltip.tsx       # Tooltip com conteúdo (H1, H2, H3)
│   │   ├── NotificationCard.tsx         # Card de notificação no painel ADM
│   │   └── NotificationForm.tsx         # Formulário de criação/edição
│   │
│   └── admin/
│       └── DesignerNotificationPanel.tsx # Painel completo no AdminSettings
│
├── pages/
│   ├── DesignerDashboard.tsx    # Modificar: adicionar NotificationBadge
│   └── AdminSettings.tsx        # Modificar: adicionar aba de notificações
│
└── hooks/
    └── useNotification.ts       # Hook customizado para notificações
```

### 3.2. Descrição dos Arquivos

#### **`types/notification.ts`**
- Define `NotificationType`, `DesignerNotification`
- Interfaces para requests/responses da API

#### **`context/NotificationContext.tsx`**
- Gerencia estado global de notificações
- Funções: `fetchNotifications`, `createNotification`, `updateNotification`, `toggleNotification`, `deleteNotification`
- Cache local para performance
- Sincronização automática

#### **`services/notificationService.ts`**
- Funções puras de API:
  - `getAllNotifications()`
  - `getNotificationByDesigner(designerId)`
  - `createNotification(data)`
  - `updateNotification(id, data)`
  - `toggleNotification(id, enabled)`
  - `deleteNotification(id)`

#### **`components/notifications/NotificationBadge.tsx`**
- Badge visual no header do DesignerDashboard
- Recebe `notification: DesignerNotification | null`
- Exibe ícone com animação baseada no `type`
- Mostra indicador visual quando há conteúdo
- Integra com `NotificationTooltip`

#### **`components/notifications/NotificationTooltip.tsx`**
- Tooltip que aparece no hover do badge
- Exibe H1, H2, H3 formatados
- Estilização baseada no `type` (cores diferentes)
- Posicionamento absoluto

#### **`components/notifications/NotificationCard.tsx`**
- Card para exibir notificação no painel ADM
- Mostra designer, tipo, status, conteúdo resumido
- Botões: Editar, Ativar/Desativar, Deletar

#### **`components/notifications/NotificationForm.tsx`**
- Formulário reutilizável para criar/editar
- Campos: Designer (select), Tipo (radio/select), H1, H2, H3, Enabled (toggle)
- Validação: pelo menos um campo de conteúdo

#### **`components/admin/DesignerNotificationPanel.tsx`**
- Painel completo no AdminSettings
- Lista de designers com suas notificações
- Permite criar/editar/ativar/desativar
- Integra `NotificationCard` e `NotificationForm`

#### **`hooks/useNotification.ts`**
- Hook customizado para acessar notificações
- Retorna: `{ notification, loading, error, refetch }`
- Para uso no DesignerDashboard

---

## 4. FLUXO DE DADOS

### 4.1. Fluxo ADM → Backend → Designer

```
┌─────────────────┐
│  Painel ADM     │
│  (AdminSettings)│
└────────┬────────┘
         │
         │ 1. Admin cria/edita notificação
         │    POST /api/designer-notifications
         │    ou PUT /api/designer-notifications/:id
         ▼
┌─────────────────┐
│    Backend       │
│  (API Server)    │
└────────┬────────┘
         │
         │ 2. Salva no banco de dados
         │    INSERT/UPDATE designer_notifications
         │
         │ 3. Retorna notificação atualizada
         ▼
┌─────────────────┐
│  Notification   │
│    Context      │
└────────┬────────┘
         │
         │ 4. Atualiza estado global
         │    setNotifications([...])
         │
         │ 5. Notifica componentes via Context
         ▼
┌─────────────────┐
│ DesignerDashboard│
│  (NotificationBadge)│
└─────────────────┘
         │
         │ 6. Re-render automático
         │    Badge aparece/desaparece
         │    Tooltip atualizado
```

### 4.2. Fluxo de Carregamento Inicial

**No DesignerDashboard:**
1. Componente monta
2. `useNotification(currentUser.id)` é chamado
3. Hook busca notificação via `GET /api/designer-notifications/designer/:id`
4. Se `enabled === true`, badge é exibido
5. Tooltip mostra conteúdo no hover

**No AdminSettings:**
1. Aba "Notificações" é aberta
2. `NotificationContext` busca todas via `GET /api/designer-notifications`
3. Lista de designers é renderizada
4. Cada designer mostra sua notificação (ou estado vazio)

### 4.3. Fluxo de Atualização em Tempo Real

**Opção 1: Polling (Simples)**
- `NotificationContext` faz polling a cada 30 segundos
- Atualiza estado se houver mudanças

**Opção 2: WebSocket (Avançado)**
- Backend emite evento quando notificação é criada/atualizada
- Frontend recebe e atualiza estado imediatamente

**Opção 3: Refetch Manual (Recomendado inicialmente)**
- Após criar/editar no ADM, chama `refetch()` manualmente
- No DesignerDashboard, refetch ao focar na janela

---

## 5. LÓGICA DE FUNCIONAMENTO DETALHADA

### 5.1. No Painel ADM (AdminSettings)

**Aba "Notificações":**

1. **Lista de Designers:**
   - Busca todos os designers (`users.filter(role === 'DESIGNER')`)
   - Para cada designer:
     - Busca notificação ativa (`GET /api/designer-notifications/designer/:id`)
     - Exibe card com status (ativa/inativa/sem notificação)

2. **Criar Notificação:**
   - Seleciona designer (dropdown ou lista)
   - Abre modal com `NotificationForm`
   - Preenche: Tipo, H1, H2, H3, Enabled
   - Submete: `POST /api/designer-notifications`
   - Atualiza lista local

3. **Editar Notificação:**
   - Clica em "Editar" no card do designer
   - Abre modal com `NotificationForm` preenchido
   - Submete: `PUT /api/designer-notifications/:id`
   - Atualiza lista local

4. **Ativar/Desativar:**
   - Toggle no card ou botão dedicado
   - Chama: `PATCH /api/designer-notifications/:id/toggle`
   - Atualiza estado local imediatamente

5. **Deletar:**
   - Botão "Deletar" no card
   - Confirmação antes de deletar
   - Chama: `DELETE /api/designer-notifications/:id`
   - Remove da lista local

### 5.2. No Painel do Designer (DesignerDashboard)

**Header com Badge:**

1. **Renderização Condicional:**
   ```typescript
   const { notification } = useNotification(currentUser.id);
   
   if (!notification || !notification.enabled) {
     return null; // Não mostra badge
   }
   ```

2. **Badge Visual:**
   - Ícone baseado no `type`:
     - `common`: Bell (cinza)
     - `important`: AlertCircle (amarelo)
     - `urgent`: AlertTriangle (vermelho)
   - Animação: pulse para `important` e `urgent`
   - Indicador de ponto vermelho se houver conteúdo

3. **Tooltip no Hover:**
   - Posicionamento: acima ou ao lado do badge
   - Exibe H1, H2, H3 formatados
   - Cores baseadas no `type`
   - Fecha ao sair do hover

4. **Atualização Automática:**
   - `useEffect` monitora mudanças no `NotificationContext`
   - Re-renderiza badge quando notificação muda
   - Refetch ao focar na janela (opcional)

---

## 6. SINCRONIZAÇÃO DE ESTADO

### 6.1. NotificationContext

```typescript
interface NotificationContextType {
  notifications: DesignerNotification[];
  loading: boolean;
  error: Error | null;
  
  // Ações
  fetchNotifications: () => Promise<void>;
  fetchNotificationByDesigner: (designerId: string) => Promise<DesignerNotification | null>;
  createNotification: (data: Omit<DesignerNotification, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateNotification: (id: string, data: Partial<DesignerNotification>) => Promise<void>;
  toggleNotification: (id: string, enabled: boolean) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  
  // Helpers
  getNotificationByDesigner: (designerId: string) => DesignerNotification | null;
}
```

### 6.2. Estratégia de Cache

- **Cache Local:** `notifications` array no Context
- **Invalidação:** Após qualquer mutação (create/update/delete/toggle)
- **Refetch:** Manual após mutações ou automático via polling

### 6.3. Otimizações

- **Memoização:** `useMemo` para filtrar notificações por designer
- **Debounce:** Em campos de formulário (opcional)
- **Lazy Loading:** Carregar notificações apenas quando necessário

---

## 7. ESTILIZAÇÃO E ANIMAÇÕES

### 7.1. Cores por Tipo

- **Common:**
  - Badge: `bg-slate-100 dark:bg-slate-800`
  - Ícone: `text-slate-600 dark:text-slate-400`
  - Tooltip: `border-slate-200 dark:border-slate-700`

- **Important:**
  - Badge: `bg-yellow-100 dark:bg-yellow-900/20`
  - Ícone: `text-yellow-600 dark:text-yellow-400`
  - Tooltip: `border-yellow-300 dark:border-yellow-700`
  - Animação: `animate-pulse`

- **Urgent:**
  - Badge: `bg-red-100 dark:bg-red-900/20`
  - Ícone: `text-red-600 dark:text-red-400`
  - Tooltip: `border-red-300 dark:border-red-700`
  - Animação: `animate-pulse` + `animate-bounce` (mais intenso)

### 7.2. Responsividade

- Badge: Tamanho fixo (32x32px) no mobile
- Tooltip: Largura máxima 320px, posicionamento adaptativo
- Cards no ADM: Grid responsivo (1 col mobile, 2-3 col desktop)

---

## 8. VALIDAÇÕES E TRATAMENTO DE ERROS

### 8.1. Validações Frontend

- **Formulário:**
  - Designer obrigatório
  - Tipo obrigatório
  - Pelo menos um campo (H1, H2 ou H3) deve ter conteúdo
  - H1, H2: max 500 caracteres
  - H3: max 2000 caracteres

### 8.2. Tratamento de Erros

- **API Errors:**
  - 400: Validação (mostrar mensagem específica)
  - 404: Notificação não encontrada (silencioso)
  - 500: Erro do servidor (toast de erro)
  - Network: Retry automático ou mensagem amigável

### 8.3. Estados de Loading

- Skeleton no lugar do badge durante carregamento
- Spinner no formulário durante submit
- Desabilitar botões durante operações

---

## 9. BOAS PRÁTICAS E ESCALABILIDADE

### 9.1. Separação de Responsabilidades

- **Services:** Apenas chamadas de API
- **Context:** Gerenciamento de estado global
- **Components:** Apenas apresentação e interação
- **Hooks:** Lógica reutilizável

### 9.2. Performance

- **Lazy Loading:** Carregar notificações sob demanda
- **Memoização:** `React.memo` em componentes puros
- **Virtualização:** Se lista de designers for muito grande (futuro)

### 9.3. Testabilidade

- **Services:** Funções puras, fáceis de testar
- **Components:** Props bem definidas, sem dependências externas
- **Hooks:** Testáveis com `@testing-library/react-hooks`

### 9.4. Manutenibilidade

- **TypeScript:** Tipos bem definidos
- **Documentação:** Comentários JSDoc em funções complexas
- **Estrutura:** Arquivos organizados por feature

---

## 10. CHECKLIST DE IMPLEMENTAÇÃO

### Backend
- [ ] Criar tabela `designer_notifications`
- [ ] Implementar endpoints (GET, POST, PUT, PATCH, DELETE)
- [ ] Validações de dados
- [ ] Tratamento de erros
- [ ] Testes unitários (opcional)

### Frontend - Types
- [ ] Criar `types/notification.ts`
- [ ] Atualizar `types.ts` principal

### Frontend - Services
- [ ] Criar `services/notificationService.ts`
- [ ] Implementar todas as funções de API

### Frontend - Context
- [ ] Criar `context/NotificationContext.tsx`
- [ ] Implementar provider e hook
- [ ] Integrar com AppContext existente

### Frontend - Components
- [ ] Criar `NotificationBadge.tsx`
- [ ] Criar `NotificationTooltip.tsx`
- [ ] Criar `NotificationCard.tsx`
- [ ] Criar `NotificationForm.tsx`
- [ ] Criar `DesignerNotificationPanel.tsx`

### Frontend - Pages
- [ ] Modificar `DesignerDashboard.tsx` (adicionar badge)
- [ ] Modificar `AdminSettings.tsx` (adicionar aba)

### Frontend - Hooks
- [ ] Criar `hooks/useNotification.ts`

### Testes e Ajustes
- [ ] Testar fluxo completo ADM → Designer
- [ ] Testar ativação/desativação
- [ ] Testar responsividade
- [ ] Ajustar estilos e animações
- [ ] Validar acessibilidade

---

## 11. CONSIDERAÇÕES FUTURAS

### Melhorias Possíveis

1. **Múltiplas Notificações:**
   - Permitir várias notificações ativas por designer
   - Badge mostra contador (ex: "3 alertas")

2. **Notificações Temporárias:**
   - Campo `expiresAt` para notificações com prazo
   - Remoção automática após expiração

3. **Histórico:**
   - Tabela `notification_history` para auditoria
   - Visualizar notificações antigas no ADM

4. **Notificações Push:**
   - Integração com service workers
   - Notificações mesmo com app fechado

5. **Templates:**
   - Templates pré-definidos de notificações
   - Reutilização rápida no ADM

---

## CONCLUSÃO

Esta arquitetura fornece:
- ✅ Controle individual por designer
- ✅ Tipos de alerta (common, important, urgent)
- ✅ Conteúdo flexível (H1, H2, H3 opcionais)
- ✅ Ativação/desativação independente
- ✅ Sincronização automática
- ✅ Escalabilidade e manutenibilidade
- ✅ Boas práticas de desenvolvimento

Pronto para implementação seguindo este plano detalhado.


