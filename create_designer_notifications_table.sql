-- Criar tabela designer_notifications
-- IMPORTANTE: designer_id usa VARCHAR(50) para corresponder ao tipo de users.id
CREATE TABLE IF NOT EXISTS designer_notifications (
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

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_designer_notifications_designer_id ON designer_notifications(designer_id);
CREATE INDEX IF NOT EXISTS idx_designer_notifications_enabled ON designer_notifications(enabled);
CREATE INDEX IF NOT EXISTS idx_designer_notifications_designer_enabled ON designer_notifications(designer_id, enabled);

-- Comentários para documentação
COMMENT ON TABLE designer_notifications IS 'Notificações visuais individuais para cada designer';
COMMENT ON COLUMN designer_notifications.type IS 'Tipo de alerta: common, important ou urgent';
COMMENT ON COLUMN designer_notifications.h1 IS 'Título principal (opcional, max 500 chars)';
COMMENT ON COLUMN designer_notifications.h2 IS 'Subtítulo (opcional, max 500 chars)';
COMMENT ON COLUMN designer_notifications.h3 IS 'Descrição completa (opcional, TEXT)';
COMMENT ON COLUMN designer_notifications.enabled IS 'Se a notificação está ativa ou não';

