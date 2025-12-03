-- Adicionar colunas de resposta aos feedbacks
-- Execute este script no seu banco de dados PostgreSQL

ALTER TABLE feedbacks 
ADD COLUMN IF NOT EXISTS response TEXT,
ADD COLUMN IF NOT EXISTS response_at BIGINT;

