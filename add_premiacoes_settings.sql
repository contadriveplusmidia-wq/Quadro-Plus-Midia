-- Script para adicionar colunas de configuração de premiações na tabela system_settings
-- Execute este SQL no seu banco de dados Neon

-- Adicionar colunas se não existirem
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS motivational_message TEXT,
ADD COLUMN IF NOT EXISTS motivational_message_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS next_award_image TEXT,
ADD COLUMN IF NOT EXISTS chart_enabled BOOLEAN DEFAULT true;

-- Verificar se as colunas foram criadas
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'system_settings'
AND column_name IN ('motivational_message', 'motivational_message_enabled', 'next_award_image', 'chart_enabled')
ORDER BY ordinal_position;


