-- Script para corrigir a estrutura da tabela designer_notifications
-- Execute este SQL no seu banco de dados

-- 1. Renomear coluna active para enabled (se necessário)
ALTER TABLE designer_notifications 
RENAME COLUMN active TO enabled;

-- 2. Alterar tipo de id de integer para VARCHAR(50)
-- Primeiro, precisamos remover a primary key
ALTER TABLE designer_notifications 
DROP CONSTRAINT IF EXISTS designer_notifications_pkey;

-- Converter id para VARCHAR(50)
ALTER TABLE designer_notifications 
ALTER COLUMN id TYPE VARCHAR(50) USING id::text;

-- Recriar primary key
ALTER TABLE designer_notifications 
ADD PRIMARY KEY (id);

-- 3. Alterar tipo de designer_id de integer para VARCHAR(50)
-- Primeiro, remover foreign key se existir
ALTER TABLE designer_notifications 
DROP CONSTRAINT IF EXISTS designer_notifications_designer_id_fkey;

-- Converter designer_id para VARCHAR(50)
ALTER TABLE designer_notifications 
ALTER COLUMN designer_id TYPE VARCHAR(50) USING designer_id::text;

-- Recriar foreign key
ALTER TABLE designer_notifications 
ADD CONSTRAINT designer_notifications_designer_id_fkey 
FOREIGN KEY (designer_id) REFERENCES users(id) ON DELETE CASCADE;

-- 4. Alterar created_at de timestamp para BIGINT
ALTER TABLE designer_notifications 
ALTER COLUMN created_at TYPE BIGINT 
USING EXTRACT(EPOCH FROM created_at)::BIGINT * 1000;

-- Tornar NOT NULL
ALTER TABLE designer_notifications 
ALTER COLUMN created_at SET NOT NULL;

-- 5. Alterar updated_at de timestamp para BIGINT
ALTER TABLE designer_notifications 
ALTER COLUMN updated_at TYPE BIGINT 
USING EXTRACT(EPOCH FROM updated_at)::BIGINT * 1000;

-- Tornar NOT NULL
ALTER TABLE designer_notifications 
ALTER COLUMN updated_at SET NOT NULL;

-- 6. Garantir que enabled seja NOT NULL com default true
ALTER TABLE designer_notifications 
ALTER COLUMN enabled SET NOT NULL;

ALTER TABLE designer_notifications 
ALTER COLUMN enabled SET DEFAULT true;

-- 7. Verificar estrutura final
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'designer_notifications'
ORDER BY ordinal_position;

