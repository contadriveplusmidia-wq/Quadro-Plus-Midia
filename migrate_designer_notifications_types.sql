-- Migração: Ajustar tipos da tabela designer_notifications para corresponder a users.id
-- Execute este SQL apenas se a tabela designer_notifications já existir

-- 1. Verificar se a tabela existe
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'designer_notifications'
  ) THEN
    -- 2. Remover foreign key existente se houver
    ALTER TABLE designer_notifications 
    DROP CONSTRAINT IF EXISTS designer_notifications_designer_id_fkey;

    -- 3. Alterar tipo da coluna designer_id de TEXT para VARCHAR(50)
    ALTER TABLE designer_notifications 
    ALTER COLUMN designer_id TYPE VARCHAR(50) USING designer_id::VARCHAR(50);

    -- 4. Alterar tipo da coluna id de TEXT para VARCHAR(50)
    ALTER TABLE designer_notifications 
    ALTER COLUMN id TYPE VARCHAR(50) USING id::VARCHAR(50);

    -- 5. Alterar tipo da coluna type de TEXT para VARCHAR(20)
    ALTER TABLE designer_notifications 
    ALTER COLUMN type TYPE VARCHAR(20) USING type::VARCHAR(20);

    -- 6. Alterar tipo das colunas h1 e h2 de TEXT para VARCHAR(500)
    ALTER TABLE designer_notifications 
    ALTER COLUMN h1 TYPE VARCHAR(500) USING h1::VARCHAR(500);

    ALTER TABLE designer_notifications 
    ALTER COLUMN h2 TYPE VARCHAR(500) USING h2::VARCHAR(500);

    -- 7. Recriar foreign key com o tipo correto
    ALTER TABLE designer_notifications 
    ADD CONSTRAINT designer_notifications_designer_id_fkey 
    FOREIGN KEY (designer_id) REFERENCES users(id) ON DELETE CASCADE;

    RAISE NOTICE 'Migração concluída: tipos ajustados para VARCHAR(50)';
  ELSE
    RAISE NOTICE 'Tabela designer_notifications não existe. Execute create_designer_notifications_table.sql primeiro.';
  END IF;
END $$;

-- 8. Verificar estrutura final
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'designer_notifications'
ORDER BY ordinal_position;


