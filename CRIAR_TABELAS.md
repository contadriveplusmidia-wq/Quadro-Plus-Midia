# Solução: Criar Tabelas de Tags

## Problema
A tabela `tags` não existe no banco de dados, causando erro ao tentar criar tags.

## Solução Automática (Já Implementada)
O servidor agora cria as tabelas automaticamente na inicialização. **Reinicie o servidor** para que isso tenha efeito:

```bash
# Pare o servidor atual (Ctrl+C)
# Depois reinicie:
npm run server
```

## Solução Manual (Se a automática não funcionar)

### Opção 1: Via SQL Editor do Neon
1. Acesse o dashboard do Neon
2. Abra o SQL Editor
3. Cole e execute o seguinte SQL:

```sql
-- Criar tabela tags
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at BIGINT NOT NULL
);

-- Criar tabela link_tags (relação muitos-para-muitos)
CREATE TABLE IF NOT EXISTS link_tags (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL REFERENCES useful_links(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(link_id, tag_id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_link_tags_link_id ON link_tags(link_id);
CREATE INDEX IF NOT EXISTS idx_link_tags_tag_id ON link_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
```

### Opção 2: Via Script SQL
O arquivo `create_tags_tables.sql` já contém esse SQL. Você pode:
1. Abrir o arquivo no editor
2. Copiar o conteúdo
3. Colar no SQL Editor do Neon
4. Executar

## Verificação
Após criar as tabelas, teste novamente criando uma tag. O erro deve desaparecer.


