# Diff Completo - Ajuste para INTEGER e Timestamp

## Resumo das Alterações

Todos os endpoints de `designer_notifications` foram ajustados para:
1. ✅ Tratar `designerId` como **INTEGER** (parse seguro com `parseInt`)
2. ✅ Usar **timestamp do Postgres** (`NOW()`) em vez de `Date.now()`
3. ✅ Converter timestamps retornados do banco para números (milliseconds) na resposta JSON

---

## 📝 Diff Detalhado por Endpoint

### 1. GET `/api/designer-notifications`

**Mudanças:**
- ✅ Parse de `designerId` do query param como INTEGER
- ✅ Validação de `isNaN` antes de usar
- ✅ Conversão de timestamps na resposta (suporta Date, number ou string)

```diff
  if (designerId) {
-     query += ` AND dn.designer_id = $${paramIndex}`;
-     params.push(designerId);
+     const parsedDesignerId = parseInt(designerId as string, 10);
+     if (isNaN(parsedDesignerId)) {
+       return res.status(400).json({ error: 'designerId deve ser um número inteiro válido' });
+     }
+     query += ` AND dn.designer_id = $${paramIndex}`;
+     params.push(parsedDesignerId);
      paramIndex++;
    }

  return res.json(result.rows.map(n => ({
    ...
-     createdAt: parseInt(n.created_at),
-     updatedAt: parseInt(n.updated_at)
+     createdAt: n.created_at instanceof Date ? n.created_at.getTime() : (typeof n.created_at === 'number' ? n.created_at : parseInt(n.created_at)),
+     updatedAt: n.updated_at instanceof Date ? n.updated_at.getTime() : (typeof n.updated_at === 'number' ? n.updated_at : parseInt(n.updated_at))
  })));
```

---

### 2. GET `/api/designer-notifications/designer/:designerId`

**Mudanças:**
- ✅ Parse de `designerId` do path param como INTEGER
- ✅ Validação de `isNaN` antes de usar
- ✅ Conversão de timestamps na resposta

```diff
  try {
    const { designerId } = req.params;
-     const result = await pool.query(
+     const parsedDesignerId = parseInt(designerId, 10);
+     if (isNaN(parsedDesignerId)) {
+       return res.status(400).json({ error: 'designerId deve ser um número inteiro válido' });
+     }
+     const result = await pool.query(
        `SELECT 
          dn.*,
          u.name as designer_name
         FROM designer_notifications dn
          LEFT JOIN users u ON dn.designer_id = u.id
          WHERE dn.designer_id = $1 AND dn.enabled = true
          ORDER BY dn.created_at DESC
          LIMIT 1`,
-       [designerId]
+       [parsedDesignerId]
      );

  return res.json({
    ...
-     createdAt: parseInt(n.created_at),
-     updatedAt: parseInt(n.updated_at)
+     createdAt: n.created_at instanceof Date ? n.created_at.getTime() : (typeof n.created_at === 'number' ? n.created_at : parseInt(n.created_at)),
+     updatedAt: n.updated_at instanceof Date ? n.updated_at.getTime() : (typeof n.updated_at === 'number' ? n.updated_at : parseInt(n.updated_at))
  });
```

---

### 3. POST `/api/designer-notifications`

**Mudanças:**
- ✅ Parse de `designerId` do body como INTEGER
- ✅ Validação de `isNaN` antes de usar
- ✅ Uso de `NOW()` do Postgres para `created_at` e `updated_at`
- ✅ Busca da notificação criada para retornar timestamps corretos
- ✅ Conversão de timestamps na resposta

```diff
  // Validações
  if (!designerId) {
    return res.status(400).json({ error: 'designerId é obrigatório' });
  }

+ // Parse seguro do designerId como INTEGER
+ const parsedDesignerId = parseInt(designerId, 10);
+ if (isNaN(parsedDesignerId)) {
+   return res.status(400).json({ error: 'designerId deve ser um número inteiro válido' });
+ }

  // Verificar se o designer existe
- const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [designerId]);
+ const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [parsedDesignerId]);
  if (userCheck.rows.length === 0) {
    return res.status(400).json({ error: 'Designer não encontrado' });
  }

  const id = `notification-${Date.now()}`;
- const createdAt = Date.now();
- const updatedAt = Date.now();
  const isEnabled = enabled !== undefined ? enabled : true;

- await pool.query(
+ // Usar timestamp do Postgres
+ await pool.query(
    `INSERT INTO designer_notifications 
     (id, designer_id, type, h1, h2, h3, enabled, created_at, updated_at) 
-    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
-   [id, designerId, type, h1 || null, h2 || null, h3 || null, isEnabled, createdAt, updatedAt]
+    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
+   [id, parsedDesignerId, type, h1 || null, h2 || null, h3 || null, isEnabled]
  );

  // Buscar nome do designer para resposta
- const designerResult = await pool.query('SELECT name FROM users WHERE id = $1', [designerId]);
+ const designerResult = await pool.query('SELECT name FROM users WHERE id = $1', [parsedDesignerId]);
  const designerName = designerResult.rows[0]?.name;

+ // Buscar notificação criada para retornar timestamps
+ const createdResult = await pool.query(
+   'SELECT created_at, updated_at FROM designer_notifications WHERE id = $1',
+   [id]
+ );
+ const createdRecord = createdResult.rows[0];
+ const createdAt = createdRecord.created_at instanceof Date 
+   ? createdRecord.created_at.getTime() 
+   : (typeof createdRecord.created_at === 'number' 
+       ? createdRecord.created_at 
+       : parseInt(createdRecord.created_at));
+ const updatedAt = createdRecord.updated_at instanceof Date 
+   ? createdRecord.updated_at.getTime() 
+   : (typeof createdRecord.updated_at === 'number' 
+       ? createdRecord.updated_at 
+       : parseInt(createdRecord.updated_at));

  return res.json({
    id,
-   designerId,
+   designerId: parsedDesignerId,
    designerName,
    ...
  });
```

---

### 4. PUT `/api/designer-notifications/:id`

**Mudanças:**
- ✅ Uso de `NOW()` do Postgres para `updated_at`
- ✅ Remoção de `Date.now()` local
- ✅ Conversão de timestamps na resposta

```diff
  if (!currentH1 && !currentH2 && !currentH3) {
    return res.status(400).json({ error: 'Pelo menos um campo (h1, h2 ou h3) deve estar preenchido' });
  }

- const updatedAt = Date.now();
-
  // Construir query dinamicamente
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  ...
  }

- updates.push(`updated_at = $${paramIndex}`);
- values.push(updatedAt);
- paramIndex++;
+ // Usar timestamp do Postgres
+ updates.push(`updated_at = NOW()`);

  values.push(id);

  return res.json({
    ...
-   createdAt: parseInt(n.created_at),
-   updatedAt: parseInt(n.updated_at)
+   createdAt: n.created_at instanceof Date ? n.created_at.getTime() : (typeof n.created_at === 'number' ? n.created_at : parseInt(n.created_at)),
+   updatedAt: n.updated_at instanceof Date ? n.updated_at.getTime() : (typeof n.updated_at === 'number' ? n.updated_at : parseInt(n.updated_at))
  });
```

---

### 5. PATCH `/api/designer-notifications/:id/toggle`

**Mudanças:**
- ✅ Uso de `NOW()` do Postgres para `updated_at`
- ✅ Remoção de `Date.now()` local
- ✅ Conversão de timestamps na resposta

```diff
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled deve ser um boolean' });
  }

- const updatedAt = Date.now();
- await pool.query(
-   'UPDATE designer_notifications SET enabled = $1, updated_at = $2 WHERE id = $3',
-   [enabled, updatedAt, id]
+ // Usar timestamp do Postgres
+ await pool.query(
+   'UPDATE designer_notifications SET enabled = $1, updated_at = NOW() WHERE id = $2',
+   [enabled, id]
  );

  return res.json({
    ...
-   createdAt: parseInt(n.created_at),
-   updatedAt: parseInt(n.updated_at)
+   createdAt: n.created_at instanceof Date ? n.created_at.getTime() : (typeof n.created_at === 'number' ? n.created_at : parseInt(n.created_at)),
+   updatedAt: n.updated_at instanceof Date ? n.updated_at.getTime() : (typeof n.updated_at === 'number' ? n.updated_at : parseInt(n.updated_at))
  });
```

---

### 6. DELETE `/api/designer-notifications/:id`

**Mudanças:**
- ✅ Nenhuma alteração necessária (não usa designerId nem timestamps)

---

## 🔍 Detalhes Técnicos

### Parse Seguro de INTEGER

```typescript
const parsedDesignerId = parseInt(designerId, 10);
if (isNaN(parsedDesignerId)) {
  return res.status(400).json({ error: 'designerId deve ser um número inteiro válido' });
}
```

**Aplicado em:**
- ✅ GET `/api/designer-notifications` (query param)
- ✅ GET `/api/designer-notifications/designer/:designerId` (path param)
- ✅ POST `/api/designer-notifications` (body)

### Uso de Timestamp do Postgres

**ANTES:**
```typescript
const createdAt = Date.now();
const updatedAt = Date.now();
await pool.query(
  `INSERT INTO ... VALUES (..., $8, $9)`,
  [..., createdAt, updatedAt]
);
```

**DEPOIS:**
```typescript
await pool.query(
  `INSERT INTO ... VALUES (..., NOW(), NOW())`,
  [...]
);
```

**Aplicado em:**
- ✅ POST: `created_at = NOW()`, `updated_at = NOW()`
- ✅ PUT: `updated_at = NOW()`
- ✅ PATCH: `updated_at = NOW()`

### Conversão de Timestamps na Resposta

Função auxiliar para converter timestamps do banco (Date, number ou string) para número (milliseconds):

```typescript
const timestamp = n.created_at instanceof Date 
  ? n.created_at.getTime() 
  : (typeof n.created_at === 'number' 
      ? n.created_at 
      : parseInt(n.created_at));
```

**Aplicado em:**
- ✅ GET `/api/designer-notifications` (array)
- ✅ GET `/api/designer-notifications/designer/:designerId` (single)
- ✅ POST `/api/designer-notifications` (busca após criar)
- ✅ PUT `/api/designer-notifications/:id` (busca após atualizar)
- ✅ PATCH `/api/designer-notifications/:id/toggle` (busca após toggle)

---

## ✅ Validações Adicionadas

1. **Validação de INTEGER:**
   - Todos os `designerId` são validados com `isNaN()` antes de usar
   - Retorna erro 400 com mensagem clara se inválido

2. **Validação de Designer Existente:**
   - Mantida no POST (verifica se designer existe antes de criar)

---

## 📊 Resumo Estatístico

- **Endpoints modificados:** 5 de 6
- **Validações de INTEGER adicionadas:** 3
- **Uso de `NOW()` adicionado:** 3 (POST, PUT, PATCH)
- **Conversões de timestamp adicionadas:** 5

---

## 🚀 Compatibilidade

- ✅ **Frontend:** Continua recebendo `designerId` como número e timestamps como números (milliseconds)
- ✅ **Banco de Dados:** Recebe `designer_id` como INTEGER e timestamps como TIMESTAMP
- ✅ **Validação:** Erros claros para valores inválidos

---

## ✅ Status Final

- ✅ Todos os `designerId` são tratados como INTEGER
- ✅ Todos os timestamps usam `NOW()` do Postgres
- ✅ Todas as respostas convertem timestamps para números (milliseconds)
- ✅ Validações de tipo adicionadas
- ✅ Nenhuma quebra de compatibilidade com frontend


