-- Script para verificar e corrigir a tabela designer_notifications
-- Execute este SQL no seu banco de dados

-- 1. Verificar estrutura atual
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'designer_notifications'
ORDER BY ordinal_position;

-- 2. Se houver problemas, recriar a tabela corretamente
-- ATENÇÃO: Isso vai deletar todos os dados existentes!
-- Descomente as linhas abaixo apenas se quiser recriar a tabela do zero

/*
-- Remover tabela existente (CUIDADO: apaga todos os dados!)
DROP TABLE IF EXISTS designer_notifications CASCADE;

-- Recriar tabela com estrutura correta
CREATE TABLE designer_notifications (
  id VARCHAR(50) PRIMARY KEY,
  designer_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('common', 'important', 'urgent')) DEFAULT 'common',
  h1 VARCHAR(500),
  h2 VARCHAR(500),
  h3 TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Criar índices
CREATE INDEX idx_designer_notifications_designer_id ON designer_notifications(designer_id);
CREATE INDEX idx_designer_notifications_enabled ON designer_notifications(enabled);
CREATE INDEX idx_designer_notifications_designer_enabled ON designer_notifications(designer_id, enabled);
*/

-- 3. Verificar constraints
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'designer_notifications'::regclass;

