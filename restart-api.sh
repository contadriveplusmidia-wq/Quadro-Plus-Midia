#!/bin/bash

echo "🔄 Reiniciando a API..."

# Matar processos na porta 3001
echo "Parando processos na porta 3001..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "Nenhum processo encontrado"

# Aguardar um pouco
sleep 2

# Iniciar a API
echo "Iniciando API na porta 3001..."
npm run server &

echo "✅ API reiniciada!"
echo "📝 Verifique se está rodando: curl http://localhost:3001/api/health"

