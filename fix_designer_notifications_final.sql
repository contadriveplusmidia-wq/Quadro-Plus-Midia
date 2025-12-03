-- Script para corrigir a estrutura da tabela designer_notifications
-- Execute este SQL no seu banco de dados

-- 1. Verificar e renomear coluna active para enabled (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'designer_notifications' 
    AND column_name = 'active'
  ) THEN
    ALTER TABLE designer_notifications RENAME COLUMN active TO enabled;
    RAISE NOTICE 'Coluna active renomeada para enabled';
  ELSE
    RAISE NOTICE 'Coluna active não existe, usando enabled';
  END IF;
END $$;

-- 2. Alterar created_at de timestamp para BIGINT
ALTER TABLE designer_notifications 
ALTER COLUMN created_at TYPE BIGINT 
USING EXTRACT(EPOCH FROM created_at)::BIGINT * 1000;

ALTER TABLE designer_notifications 
ALTER COLUMN created_at SET NOT NULL;

-- 3. Alterar updated_at de timestamp para BIGINT
ALTER TABLE designer_notifications 
ALTER COLUMN updated_at TYPE BIGINT 
USING EXTRACT(EPOCH FROM updated_at)::BIGINT * 1000;

ALTER TABLE designer_notifications 
ALTER COLUMN updated_at SET NOT NULL;

-- 4. Garantir que enabled seja NOT NULL com default true
ALTER TABLE designer_notifications 
ALTER COLUMN enabled SET NOT NULL;

ALTER TABLE designer_notifications 
ALTER COLUMN enabled SET DEFAULT true;

-- 5. Verificar estrutura final
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'designer_notifications'
ORDER BY ordinal_position;

