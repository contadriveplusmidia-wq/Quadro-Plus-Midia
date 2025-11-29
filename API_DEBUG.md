# Debug da API de Tags

## Problema
Erro "Unexpected token '<' ... is not valid JSON" ao criar Tag

## Possíveis Causas
1. A rota `/api/tags` não está sendo encontrada
2. A API está retornando HTML (página de erro) em vez de JSON
3. A tabela `tags` não existe no banco de dados
4. Problema de CORS ou middleware bloqueando a requisição

## Como Testar

### 1. Verificar se a rota existe
No navegador, acesse: `http://localhost:3001/api/tags`
- Se aparecer JSON (array vazio ou lista de tags) → Rota existe ✅
- Se aparecer HTML ou erro 404 → Rota não existe ❌

### 2. Testar criação via curl
```bash
curl -X POST http://localhost:3001/api/tags \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","color":"#ECE6FF"}'
```

### 3. Verificar logs do servidor
Os logs devem mostrar:
- `POST /api/tags chamado`
- `Dados recebidos: { name: '...', color: '...' }`

### 4. Verificar se a tabela existe
Execute no banco de dados:
```sql
SELECT * FROM tags LIMIT 1;
```

Se der erro, execute o script: `create_tags_tables.sql`

## Correções Aplicadas

1. ✅ Adicionado logs de debug na API
2. ✅ Melhorado tratamento de erros no frontend
3. ✅ Validação de Content-Type para garantir JSON
4. ✅ Tratamento específico para tabela não existente
5. ✅ Mensagens de erro mais claras

## Próximos Passos

1. Execute `create_tags_tables.sql` no banco Neon
2. Reinicie o servidor: `npm run server`
3. Tente criar uma tag novamente
4. Verifique o console do navegador (F12) para erros

