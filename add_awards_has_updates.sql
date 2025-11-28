-- Script para adicionar coluna awards_has_updates na tabela system_settings
-- Execute este SQL no seu banco de dados Neon

-- Adicionar coluna se não existir
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS awards_has_updates BOOLEAN DEFAULT false;

-- Verificar se a coluna foi criada
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'system_settings'
AND column_name = 'awards_has_updates';

