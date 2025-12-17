-- Adicionar coluna tag na tabela demands
-- Esta coluna armazena a tag automática gerada para cada demanda
-- Formato: {CODIGO_DO_DIA}{ORDEM_DA_DEMANDA}
-- Exemplos: S1, T2, QA1, QI2, F1, SB1

-- IMPORTANTE: Permitir NULL durante transição e para casos especiais (ex: domingo)
ALTER TABLE demands 
ADD COLUMN IF NOT EXISTS tag VARCHAR(10) NULL;

-- Se a coluna já existir e for NOT NULL, alterar para permitir NULL
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demands' 
        AND column_name = 'tag' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE demands ALTER COLUMN tag DROP NOT NULL;
    END IF;
END $$;

-- Criar índice para melhorar performance em consultas por tag
CREATE INDEX IF NOT EXISTS idx_demands_tag ON demands(tag);

-- Comentário na coluna
COMMENT ON COLUMN demands.tag IS 'Tag automática gerada baseada no dia da semana e ordem da demanda no dia. NULL para domingos ou casos especiais.';

