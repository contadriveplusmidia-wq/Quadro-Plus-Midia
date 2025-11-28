-- Script para criar tabelas de tags e link_tags
-- Execute este SQL no seu banco de dados Neon

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

