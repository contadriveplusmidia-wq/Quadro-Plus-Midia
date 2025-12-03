# Diff Final - Migração de Tipos designer_notifications

## ✅ Tipo Identificado

**`users.id` = `VARCHAR(50)`**

Confirmado em `database_export.sql` e usado consistentemente em todas as tabelas relacionadas.

---

## 📝 Diff do SQL de Criação

### Arquivo: `create_designer_notifications_table.sql`

```diff
-- Criar tabela designer_notifications
+ -- IMPORTANTE: designer_id usa VARCHAR(50) para corresponder ao tipo de users.id
  CREATE TABLE IF NOT EXISTS designer_notifications (
-   id TEXT PRIMARY KEY,
-   designer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
-   type TEXT NOT NULL CHECK (type IN ('common', 'important', 'urgent')) DEFAULT 'common',
-   h1 TEXT,
-   h2 TEXT,
+   id VARCHAR(50) PRIMARY KEY,
+   designer_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
+   type VARCHAR(20) NOT NULL CHECK (type IN ('common', 'important', 'urgent')) DEFAULT 'common',
+   h1 VARCHAR(500),
+   h2 VARCHAR(500),
    h3 TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  );
```

**Mudanças:**
- ✅ `id`: `TEXT` → `VARCHAR(50)` (compatível com padrão do sistema)
- ✅ `designer_id`: `TEXT` → `VARCHAR(50)` (compatível com `users.id`)
- ✅ `type`: `TEXT` → `VARCHAR(20)` (otimização)
- ✅ `h1`: `TEXT` → `VARCHAR(500)` (limite explícito)
- ✅ `h2`: `TEXT` → `VARCHAR(500)` (limite explícito)
- ✅ `h3`: mantido como `TEXT` (pode ser maior que 500)

---

## 📝 SQL de Migração Criado

### Arquivo: `migrate_designer_notifications_types.sql` (NOVO)

Script completo para migrar tabela existente:

```sql
-- Migração: Ajustar tipos da tabela designer_notifications para corresponder a users.id
-- Execute este SQL apenas se a tabela designer_notifications já existir

-- 1. Verificar se a tabela existe
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'designer_notifications'
  ) THEN
    -- 2. Remover foreign key existente se houver
    ALTER TABLE designer_notifications 
    DROP CONSTRAINT IF EXISTS designer_notifications_designer_id_fkey;

    -- 3. Alterar tipo da coluna designer_id de TEXT para VARCHAR(50)
    ALTER TABLE designer_notifications 
    ALTER COLUMN designer_id TYPE VARCHAR(50) USING designer_id::VARCHAR(50);

    -- 4. Alterar tipo da coluna id de TEXT para VARCHAR(50)
    ALTER TABLE designer_notifications 
    ALTER COLUMN id TYPE VARCHAR(50) USING id::VARCHAR(50);

    -- 5. Alterar tipo da coluna type de TEXT para VARCHAR(20)
    ALTER TABLE designer_notifications 
    ALTER COLUMN type TYPE VARCHAR(20) USING type::VARCHAR(20);

    -- 6. Alterar tipo das colunas h1 e h2 de TEXT para VARCHAR(500)
    ALTER TABLE designer_notifications 
    ALTER COLUMN h1 TYPE VARCHAR(500) USING h1::VARCHAR(500);

    ALTER TABLE designer_notifications 
    ALTER COLUMN h2 TYPE VARCHAR(500) USING h2::VARCHAR(500);

    -- 7. Recriar foreign key com o tipo correto
    ALTER TABLE designer_notifications 
    ADD CONSTRAINT designer_notifications_designer_id_fkey 
    FOREIGN KEY (designer_id) REFERENCES users(id) ON DELETE CASCADE;

    RAISE NOTICE 'Migração concluída: tipos ajustados para VARCHAR(50)';
  ELSE
    RAISE NOTICE 'Tabela designer_notifications não existe. Execute create_designer_notifications_table.sql primeiro.';
  END IF;
END $$;

-- 8. Verificar estrutura final
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'designer_notifications'
ORDER BY ordinal_position;
```

---

## 🔍 Verificação do Backend

### ✅ Nenhuma alteração necessária no código backend!

**Motivo:** Os endpoints já trabalham com strings JavaScript, que são automaticamente convertidas para `VARCHAR(50)` pelo PostgreSQL.

**Endpoints verificados (todos OK):**

1. **GET `/api/designer-notifications`**
   - ✅ Usa `designerId` como string do query param
   - ✅ Query: `WHERE dn.designer_id = $1` (compatível)

2. **GET `/api/designer-notifications/designer/:designerId`**
   - ✅ Usa `designerId` como string do path param
   - ✅ Query: `WHERE dn.designer_id = $1` (compatível)

3. **POST `/api/designer-notifications`**
   - ✅ Recebe `designerId` como string no body
   - ✅ Valida: `SELECT id FROM users WHERE id = $1` (compatível)
   - ✅ Insere: `INSERT INTO ... (designer_id, ...) VALUES ($2, ...)` (compatível)

4. **PUT `/api/designer-notifications/:id`**
   - ✅ Usa `id` como string do path param
   - ✅ Query: `WHERE id = $1` (compatível)

5. **PATCH `/api/designer-notifications/:id/toggle`**
   - ✅ Usa `id` como string do path param
   - ✅ Query: `WHERE id = $1` (compatível)

6. **DELETE `/api/designer-notifications/:id`**
   - ✅ Usa `id` como string do path param
   - ✅ Query: `WHERE id = $1` (compatível)

**Todas as queries usam parâmetros preparados (`$1`, `$2`, etc.), garantindo:**
- ✅ Segurança (proteção contra SQL injection)
- ✅ Compatibilidade de tipos automática
- ✅ Nenhuma alteração de código necessária

---

## 📋 Resumo das Alterações

### Arquivos Modificados:
1. ✅ `create_designer_notifications_table.sql` - Tipos ajustados para `VARCHAR(50)`

### Arquivos Criados:
1. ✅ `migrate_designer_notifications_types.sql` - Script de migração
2. ✅ `RESUMO_MIGRACAO_TIPOS.md` - Documentação completa
3. ✅ `DIFS_MIGRACAO_TIPOS.md` - Este arquivo (diff final)

### Arquivos NÃO Modificados (já estavam corretos):
- ✅ `api/index.ts` - Nenhuma alteração necessária
- ✅ `types.ts` - Nenhuma alteração necessária
- ✅ Frontend - Nenhuma alteração necessária

---

## 🚀 Como Aplicar

### Cenário 1: Tabela NÃO existe
Execute apenas:
```sql
-- Copie e execute o conteúdo de create_designer_notifications_table.sql
```

### Cenário 2: Tabela JÁ existe
Execute:
```sql
-- Copie e execute o conteúdo de migrate_designer_notifications_types.sql
```

### Verificação Pós-Migração
```sql
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'designer_notifications'
ORDER BY ordinal_position;
```

**Resultado esperado:**
- `id`: `character varying`, `50`
- `designer_id`: `character varying`, `50` ✅
- `type`: `character varying`, `20`
- `h1`: `character varying`, `500`
- `h2`: `character varying`, `500`
- `h3`: `text`, `null`

---

## ✅ Conclusão

- ✅ Tipo de `users.id` identificado: `VARCHAR(50)`
- ✅ SQL de criação atualizado
- ✅ SQL de migração criado
- ✅ Backend já compatível (zero alterações)
- ✅ Foreign key será criada corretamente
- ✅ Compatibilidade total garantida

**Status:** ✅ Pronto para execução no banco de dados!


