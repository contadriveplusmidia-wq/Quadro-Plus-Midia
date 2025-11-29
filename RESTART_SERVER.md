# Como Reiniciar o Servidor para Ativar as Rotas de Tags

## Problema
O servidor está retornando erro 404 "Cannot POST /api/tags" porque as rotas foram adicionadas mas o servidor não foi reiniciado.

## Solução

### 1. Parar o servidor atual
No terminal onde o servidor está rodando, pressione `Ctrl+C` (ou `Cmd+C` no Mac).

OU mate o processo:
```bash
# Encontrar o PID
ps aux | grep "tsx api/index.ts"

# Matar o processo (substitua PID pelo número encontrado)
kill -9 PID
```

### 2. Reiniciar o servidor
```bash
npm run server
```

OU para rodar servidor + cliente juntos:
```bash
npm run dev
```

### 3. Verificar se está funcionando
Após reiniciar, teste:
```bash
curl http://localhost:3001/api/tags
```

Deve retornar um array JSON (vazio ou com tags).

### 4. Testar criação de tag
```bash
curl -X POST http://localhost:3001/api/tags \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","color":"#ECE6FF"}'
```

## Importante
**SEMPRE reinicie o servidor após modificar arquivos em `/api/index.ts`**

As rotas são carregadas quando o servidor inicia, então mudanças no código só têm efeito após reiniciar.

