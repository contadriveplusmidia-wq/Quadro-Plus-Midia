-- Script para verificar e criar a tabela awards no Neon
-- Execute este SQL no seu banco de dados Neon

-- 1. Verificar se a tabela existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'awards'
);

-- 2. Se a tabela não existir, execute o comando abaixo:
CREATE TABLE IF NOT EXISTS awards (
  id VARCHAR(50) PRIMARY KEY,
  designer_id VARCHAR(50),
  designer_name VARCHAR(255) NOT NULL,
  month VARCHAR(50) NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at BIGINT NOT NULL
);

-- 3. Verificar se a foreign key existe (opcional, mas recomendado)
-- Se não existir, adicione:
ALTER TABLE awards 
ADD CONSTRAINT awards_designer_id_fkey 
FOREIGN KEY (designer_id) REFERENCES users(id);

-- 4. Verificar estrutura da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'awards'
ORDER BY ordinal_position;

-- 5. Testar inserção (substitua os valores pelos seus dados reais)
-- INSERT INTO awards (id, designer_id, designer_name, month, description, image_url, created_at)
-- VALUES ('test-123', 'd1', 'Teste Designer', 'Janeiro', 'Teste', NULL, EXTRACT(EPOCH FROM NOW())::BIGINT * 1000);


