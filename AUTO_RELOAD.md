# Sistema de Auto-Reload Automático

Este projeto agora possui um sistema automatizado para garantir que o frontend e backend estejam sempre atualizados após modificações.

## 🚀 Funcionalidades

### 1. **Backend com Watch Mode**
- O servidor backend agora usa `tsx --watch` que reinicia automaticamente quando arquivos em `/api` são modificados
- Não é mais necessário reiniciar manualmente após mudanças no backend

### 2. **Frontend com Hot Reload**
- O Vite já possui hot reload nativo que atualiza a página automaticamente
- Configurado com HMR (Hot Module Replacement) para atualizações instantâneas
- Se o hot reload não funcionar, use `npm run client:force` para rebuild forçado

### 3. **Scripts Disponíveis**

```bash
# Iniciar ambos os servidores (recomendado)
npm run dev

# Iniciar apenas o backend (com watch mode)
npm run server

# Iniciar apenas o frontend
npm run client

# Frontend com rebuild forçado (se hot reload não funcionar)
npm run client:force

# Verificar status dos servidores
npm run check:dev

# Reiniciar apenas o backend
npm run restart:server

# Reiniciar apenas o frontend
npm run restart:client
```

## 🔄 Como Funciona

### Após Modificações no Backend (`/api/*.ts`)
1. O `tsx --watch` detecta a mudança automaticamente
2. O servidor reinicia em ~1-2 segundos
3. As rotas são recarregadas automaticamente
4. **Nenhuma ação manual necessária**

### Após Modificações no Frontend (`/pages/*`, `/components/*`, etc.)
1. O Vite detecta a mudança via HMR
2. A página atualiza automaticamente no navegador
3. Se não atualizar, force refresh: `Cmd+Shift+R` (Mac) ou `Ctrl+Shift+R` (Windows/Linux)

## 🛠️ Solução de Problemas

### Hot Reload não está funcionando?
1. Verifique se o frontend está rodando: `npm run check:dev`
2. Force rebuild: `npm run client:force`
3. Limpe o cache do navegador: `Cmd+Shift+R` / `Ctrl+Shift+R`
4. Verifique se há erros no console do navegador

### Backend não está reiniciando?
1. Verifique se está usando `npm run server` (com watch mode)
2. Se estiver usando `npm run server:once`, mude para `npm run server`
3. Verifique se há erros de sintaxe que impedem o restart

### Mudanças não aparecem?
1. **Frontend**: Force refresh no navegador (`Cmd+Shift+R` / `Ctrl+Shift+R`)
2. **Backend**: Aguarde 1-2 segundos para o restart automático
3. Verifique os logs do terminal para erros

## 📝 Notas Importantes

- O sistema funciona automaticamente quando você usa `npm run dev`
- Para desenvolvimento, sempre use `npm run dev` para ter ambos os servidores rodando
- O watch mode do backend reinicia apenas quando há mudanças em arquivos `.ts` ou `.js` em `/api`
- O hot reload do Vite funciona para arquivos `.tsx`, `.ts`, `.css` e outros assets

## 🔍 Verificação Rápida

Execute `npm run check:dev` para ver o status atual dos servidores:

```
📊 Status dos Servidores de Desenvolvimento:

Backend (porta 3001):  ✅ Rodando
Frontend (porta 5000): ✅ Rodando
```

