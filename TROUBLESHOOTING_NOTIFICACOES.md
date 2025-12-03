# Troubleshooting - Sistema de Notificações

## Erro: "Erro ao criar notificação"

### Causa Mais Comum: Tabela não criada no banco de dados

O erro mais provável é que a tabela `designer_notifications` ainda não foi criada no banco de dados.

### Solução:

1. **Acesse o SQL Editor do seu banco de dados** (Neon, Vercel, PostgreSQL, etc.)

2. **Execute o SQL do arquivo `create_designer_notifications_table.sql`:**

```sql
-- Criar tabela designer_notifications
CREATE TABLE IF NOT EXISTS designer_notifications (
  id TEXT PRIMARY KEY,
  designer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('common', 'important', 'urgent')) DEFAULT 'common',
  h1 TEXT,
  h2 TEXT,
  h3 TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_designer_notifications_designer_id ON designer_notifications(designer_id);
CREATE INDEX IF NOT EXISTS idx_designer_notifications_enabled ON designer_notifications(enabled);
CREATE INDEX IF NOT EXISTS idx_designer_notifications_designer_enabled ON designer_notifications(designer_id, enabled);
```

3. **Reinicie o servidor:**

```bash
npm run server
```

### Verificar se a tabela foi criada:

Execute no SQL Editor:

```sql
SELECT * FROM designer_notifications LIMIT 1;
```

Se não der erro, a tabela existe!

### Outros Erros Possíveis:

1. **"Designer não encontrado"**
   - Verifique se o designer selecionado existe na tabela `users`
   - Verifique se o `designerId` está correto

2. **"Pelo menos um campo (h1, h2 ou h3) deve estar preenchido"**
   - Preencha pelo menos um dos campos H1, H2 ou H3

3. **"type deve ser: common, important ou urgent"**
   - Verifique se o tipo está sendo enviado corretamente

### Debug:

Abra o console do navegador (F12) e verifique:
- Mensagens de erro detalhadas
- Requisições na aba Network
- Resposta do servidor

O código agora mostra mensagens de erro mais detalhadas no formulário!


