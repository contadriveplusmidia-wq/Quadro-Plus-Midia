import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
// PostgreSQL removido - usando apenas SQLite (local e servidor local)
// import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Carregar variáveis de ambiente (ESModules)
import dotenv from 'dotenv';
dotenv.config();

// ============ DETECÇÃO DE AMBIENTE ============
// Sempre usar SQLite (local e servidor local)
// Removida lógica de Vercel/PostgreSQL
const useSQLite = true; // Sempre SQLite

// ============ CONEXÃO SQLITE (LOCAL) ============
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

let db: DatabaseType | null = null;
try {
  // Obter diretório atual (ESModules)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dbPath = path.join(__dirname, '..', 'database.db');
  
  console.log('🔍 Tentando conectar SQLite...');
  console.log('📁 Caminho do arquivo:', dbPath);
  console.log('📁 Caminho absoluto:', path.resolve(dbPath));
  
  // Verificar se o arquivo existe
  const exists = fs.existsSync(dbPath);
  console.log('📄 Arquivo existe?', exists);
  
  if (!exists) {
    console.warn('⚠️  Arquivo database.db não encontrado. Criando novo arquivo...');
  }
  
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  console.log('✅ Conectado ao banco de dados SQLite:', dbPath);
} catch (err: any) {
  console.error('❌ Erro ao conectar SQLite:', err);
  console.error('❌ Detalhes do erro:', err.message);
  console.error('❌ Stack:', err.stack);
  process.exit(1);
}

// ============ CONEXÃO POSTGRESQL ============
// Removido - usando apenas SQLite (local e servidor local)
/*
let pool: Pool | null = null;
if (!useSQLite) {
  // Verificar se DATABASE_URL está configurada
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERRO: DATABASE_URL não está definida no arquivo .env');
    process.exit(1);
  }

  // Verificar se não está tentando conectar em localhost (exceto em desenvolvimento local)
  if (process.env.DATABASE_URL.includes('localhost') && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  AVISO: Tentando conectar em localhost em produção!');
  }

  // Configuração do pool de conexão
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Sempre usar SSL para Neon/Vercel (já vem na connection string, mas garantimos aqui também)
    ssl: process.env.DATABASE_URL?.includes('neon') || process.env.DATABASE_URL?.includes('vercel') 
      ? { rejectUnauthorized: false } 
      : undefined
  });

  // Verificar conexão na inicialização
  pool.on('connect', () => {
    console.log('✅ Conectado ao banco de dados PostgreSQL');
  });

  pool.on('error', (err) => {
    console.error('❌ Erro na conexão do banco de dados:', err);
  });
}
*/

// Variáveis de ambiente simplificadas - sempre desenvolvimento local
const isProduction = false;
const isDevelopment = true;

// ============ FUNÇÕES AUXILIARES PARA QUERIES ============
// Abstração para executar queries SQLite
// SQLite usa placeholders ? - converter $1, $2, etc para ?
function convertPlaceholders(sql: string): string {
  // Converter $1, $2, etc para ? mantendo a ordem
  // Substituir do maior para o menor para evitar conflitos (ex: $10 antes de $1)
  let converted = sql;
  const matches = sql.match(/\$(\d+)/g) || [];
  if (matches.length > 0) {
    const placeholders = [...new Set(matches)].map(m => parseInt(m.substring(1))).sort((a, b) => b - a);
    for (const num of placeholders) {
      converted = converted.replace(new RegExp(`\\$${num}\\b`, 'g'), '?');
    }
  }
  return converted;
}

function convertParams(params: any[]): any[] {
  // SQLite e PostgreSQL aceitam arrays, mas SQLite precisa de valores convertidos
  if (useSQLite) {
    return params.map(p => {
      // Converter undefined para null (SQLite não aceita undefined)
      if (p === undefined) return null;
      // Converter boolean para 0/1 se necessário
      if (typeof p === 'boolean') return p ? 1 : 0;
      return p;
    });
  }
  return params;
}

// Função para executar query SELECT (retorna array de resultados)
async function query(sql: string, params: any[] = []): Promise<any[]> {
  if (!db) {
    throw new Error('Banco de dados SQLite não inicializado');
  }
  const convertedSql = convertPlaceholders(sql);
  const convertedParams = convertParams(params);
  const stmt = db.prepare(convertedSql);
  return stmt.all(...convertedParams);
}

// Função para executar query que retorna uma única linha
async function queryOne(sql: string, params: any[] = []): Promise<any | null> {
  if (!db) {
    throw new Error('Banco de dados SQLite não inicializado');
  }
  const convertedSql = convertPlaceholders(sql);
  const convertedParams = convertParams(params);
  const stmt = db.prepare(convertedSql);
  return stmt.get(...convertedParams) || null;
}

// Função para executar query INSERT/UPDATE/DELETE (retorna informações de execução)
async function execute(sql: string, params: any[] = []): Promise<any> {
  if (!db) {
    throw new Error('Banco de dados SQLite não inicializado');
  }
  const convertedSql = convertPlaceholders(sql);
  const convertedParams = convertParams(params);
  const stmt = db.prepare(convertedSql);
  const result = stmt.run(...convertedParams);
  return {
    rowsAffected: result.changes,
    lastInsertRowid: result.lastInsertRowid
  };
}

// Função para iniciar transação
async function beginTransaction(): Promise<any> {
  if (!db) {
    throw new Error('Banco de dados SQLite não inicializado');
  }
  // SQLite não precisa de BEGIN explícito, mas podemos usar transação
  return db.transaction(() => {});
}

// Função para commit de transação
async function commitTransaction(client: any): Promise<void> {
  // SQLite commit é automático, mas podemos chamar explicitamente
  return;
}

// Função para rollback de transação
async function rollbackTransaction(client: any): Promise<void> {
  // SQLite rollback é automático em caso de erro
  return;
}

// Função helper para executar transação SQLite
function runTransaction(callback: (db: DatabaseType) => void): void {
  if (!db) {
    throw new Error('Banco de dados SQLite não inicializado');
  }
  const transactionFn = db.transaction(() => {
    callback(db);
  });
  transactionFn();
}

// ============ FUNÇÃO HELPER PARA CONVERTER CAMPOS NUMÉRICOS ============
// SQLite retorna números como strings, então precisamos converter antes de enviar ao frontend
function convertNumericFields(data: any, fields: string[]): any {
  if (!data || typeof data !== 'object') return data;
  
  const converted = Array.isArray(data) ? [...data] : { ...data };
  
  for (const field of fields) {
    if (converted[field] !== undefined && converted[field] !== null) {
      const value = converted[field];
      // Converter string numérica para number
      if (typeof value === 'string' && value.trim() !== '') {
        const num = Number(value);
        if (!isNaN(num)) {
          converted[field] = num;
        }
      } else if (typeof value === 'number') {
        // Já é número, manter
        converted[field] = value;
      }
    }
  }
  
  return converted;
}

// Converter campos numéricos em array de objetos
function convertNumericFieldsInArray(dataArray: any[], fields: string[]): any[] {
  return dataArray.map(item => convertNumericFields(item, fields));
}

const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// ============ AUTH ============
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { name, password } = req.body;
    
    // SQLite pode armazenar booleanos como 't'/'f' ou 1/0 ou 1.0, então vamos usar uma query mais flexível
    const users = await query(
      useSQLite
        ? "SELECT id, name, password, role, avatar_url, avatar_color, active FROM users WHERE name = ? AND (active = 1 OR active = 1.0 OR active = 't' OR active = 'true' OR CAST(active AS REAL) = 1)"
        : 'SELECT id, name, password, role, avatar_url, avatar_color, active FROM users WHERE name = $1 AND active = true',
      [name]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    const user = users[0];
    
    // Em desenvolvimento, permite login do admin com senha plain-text '123456'
    const devAdminBypass = isDevelopment && user.role === 'ADM' && password === '123456';
    
    let isValidPassword = false;
    if (devAdminBypass) {
      isValidPassword = true;
      console.log('✅ Login via dev bypass (senha 123456)');
    } else {
      try {
        isValidPassword = await comparePassword(password, user.password);
        console.log('🔍 Comparação bcrypt:', isValidPassword ? '✅ Senha válida' : '❌ Senha inválida');
      } catch (compareError) {
        console.error('❌ Erro ao comparar senha:', compareError);
        isValidPassword = false;
      }
    }
    
    if (!isValidPassword) {
      console.log('❌ Login falhou para usuário:', name);
      console.log('🔍 Dev bypass ativo?', devAdminBypass);
      return res.status(401).json({ error: 'Senha incorreta' });
    }
    
    // Converter active para boolean se necessário
    const activeValue = user.active === 1 || user.active === 't' || user.active === 'true' || user.active === true;
    
    return res.json({
      id: user.id,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatar_url,
      avatarColor: user.avatar_color,
      active: activeValue
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

app.put('/api/auth/change-password', async (req: Request, res: Response) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    
    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }
    
    const user = await queryOne('SELECT password FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const isValidPassword = await comparePassword(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }
    
    const hashedNewPassword = await hashPassword(newPassword);
    await execute('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId]);
    
    return res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

// ============ USERS ============
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const users = await query('SELECT id, name, role, avatar_url, avatar_color, active FROM users ORDER BY name');
    return res.json(users.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      avatarUrl: u.avatar_url,
      avatarColor: u.avatar_color,
      active: u.active
    })));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

app.get('/api/users/designers', async (req: Request, res: Response) => {
  try {
    const users = await query(
      "SELECT id, name, role, avatar_url, avatar_color, active FROM users WHERE role = 'DESIGNER' ORDER BY name"
    );
    return res.json(users.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      avatarUrl: u.avatar_url,
      avatarColor: u.avatar_color,
      active: u.active
    })));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar designers' });
  }
});

app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { name, password, role, avatarColor } = req.body;
    const id = `user-${Date.now()}`;
    const hashedPassword = await hashPassword(password || '123');
    await execute(
      'INSERT INTO users (id, name, password, role, avatar_color, active) VALUES (?, ?, ?, ?, ?, 1)',
      [id, name, hashedPassword, role || 'DESIGNER', avatarColor]
    );
    return res.json({ id, name, role: role || 'DESIGNER', avatarColor, active: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, password, active, avatarColor } = req.body;
    
    // Só hashar senha se ela foi fornecida e não está vazia
    const hashedPassword = (password && password.trim().length > 0) ? await hashPassword(password.trim()) : null;
    
    // SQLite não tem COALESCE da mesma forma, então vamos construir a query dinamicamente
    const updates: string[] = [];
    const params: any[] = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (hashedPassword !== null) {
      updates.push('password = ?');
      params.push(hashedPassword);
    }
    if (active !== undefined) {
      updates.push('active = ?');
      params.push(active ? 1 : 0);
    }
    if (avatarColor !== undefined) {
      updates.push('avatar_color = ?');
      params.push(avatarColor);
    }
    
    if (updates.length > 0) {
      params.push(id);
      await execute(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }
    
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // SQLite suporta transações via db.transaction (síncrono)
    if (useSQLite && db) {
      const transaction = db.transaction(() => {
        // 1. Remover demand_items (via demands do usuário)
        db.prepare('DELETE FROM demand_items WHERE demand_id IN (SELECT id FROM demands WHERE user_id = ?)').run(id);
        
        // 2. Remover demands do usuário
        db.prepare('DELETE FROM demands WHERE user_id = ?').run(id);
        
        // 3. Remover work_sessions do usuário
        db.prepare('DELETE FROM work_sessions WHERE user_id = ?').run(id);
        
        // 4. Remover feedbacks onde o usuário é o designer
        db.prepare('DELETE FROM feedbacks WHERE designer_id = ?').run(id);
        
        // 5. Remover lesson_progress do usuário
        db.prepare('DELETE FROM lesson_progress WHERE designer_id = ?').run(id);
        
        // 6. Finalmente, deletar o próprio usuário
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
      });
      
      transaction();
    } else {
      // PostgreSQL (comentado para desenvolvimento local)
      /*
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM demand_items WHERE demand_id IN (SELECT id FROM demands WHERE user_id = $1)', [id]);
        await client.query('DELETE FROM demands WHERE user_id = $1', [id]);
        await client.query('DELETE FROM work_sessions WHERE user_id = $1', [id]);
        await client.query('DELETE FROM feedbacks WHERE designer_id = $1', [id]);
        await client.query('DELETE FROM lesson_progress WHERE designer_id = $1', [id]);
        await client.query('DELETE FROM users WHERE id = $1', [id]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      */
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Erro ao remover usuário' });
  }
});

// ============ ART TYPES ============
app.get('/api/art-types', async (req: Request, res: Response) => {
  try {
    const arts = await query('SELECT * FROM art_types ORDER BY sort_order');
    const converted = convertNumericFieldsInArray(arts.map(a => ({
      id: a.id,
      label: a.label,
      points: a.points,
      order: a.sort_order
    })), ['points', 'order']);
    return res.json(converted);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar tipos de arte' });
  }
});

app.post('/api/art-types', async (req: Request, res: Response) => {
  try {
    const { label, points } = req.body;
    const id = `art-${Date.now()}`;
    const maxOrderResult = await queryOne('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM art_types');
    const order = Number(maxOrderResult?.next || 0);
    await execute(
      'INSERT INTO art_types (id, label, points, sort_order) VALUES (?, ?, ?, ?)',
      [id, label, points, order]
    );
    return res.json(convertNumericFields({ id, label, points, order }, ['points', 'order']));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar tipo de arte' });
  }
});

app.put('/api/art-types/reorder', async (req: Request, res: Response) => {
  try {
    const { artTypes } = req.body;
    if (useSQLite && db) {
      const transaction = db.transaction(() => {
        for (const art of artTypes) {
          db.prepare('UPDATE art_types SET sort_order = ? WHERE id = ?').run(art.order, art.id);
        }
      });
      transaction();
    } else {
      // PostgreSQL (comentado para desenvolvimento local)
      /*
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const art of artTypes) {
          await client.query('UPDATE art_types SET sort_order = $1 WHERE id = $2', [art.order, art.id]);
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      */
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao reordenar' });
  }
});

app.put('/api/art-types/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, points, order } = req.body;
    
    // Construir query dinamicamente para SQLite
    const updates: string[] = [];
    const params: any[] = [];
    
    if (label !== undefined) {
      updates.push('label = ?');
      params.push(label);
    }
    if (points !== undefined) {
      updates.push('points = ?');
      params.push(points);
    }
    if (order !== undefined) {
      updates.push('sort_order = ?');
      params.push(order);
    }
    
    if (updates.length > 0) {
      params.push(id);
      await execute(
        `UPDATE art_types SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }
    
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar tipo de arte' });
  }
});

app.delete('/api/art-types/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM art_types WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover tipo de arte' });
  }
});

// ============ WORK SESSIONS ============
app.get('/api/work-sessions', async (req: Request, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.query;
    let sql = 'SELECT * FROM work_sessions WHERE 1=1';
    const params: any[] = [];
    if (userId) {
      params.push(userId);
      sql += useSQLite ? ' AND user_id = ?' : ` AND user_id = $${params.length}`;
    }
    if (startDate) {
      params.push(parseInt(startDate as string));
      sql += useSQLite ? ' AND timestamp >= ?' : ` AND timestamp >= $${params.length}`;
    }
    if (endDate) {
      params.push(parseInt(endDate as string));
      sql += useSQLite ? ' AND timestamp <= ?' : ` AND timestamp <= $${params.length}`;
    }
    sql += ' ORDER BY timestamp DESC';
    const sessions = await query(sql, params);
    return res.json(convertNumericFieldsInArray(sessions.map(s => ({
      id: s.id,
      userId: s.user_id,
      timestamp: s.timestamp
    })), ['timestamp']));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar sessões' });
  }
});

app.post('/api/work-sessions', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const now = new Date();
    const currentHour = now.getHours();
    
    // Verificar se é antes das 6h da manhã - não permitir registro
    if (currentHour < 6) {
      return res.status(400).json({ 
        error: 'Registros só são permitidos a partir das 6h da manhã',
        code: 'BEFORE_6AM'
      });
    }
    
    const id = `session-${Date.now()}`;
    const timestamp = Date.now();
    
    // Calcular início do dia útil (6h da manhã)
    const today = new Date();
    today.setHours(6, 0, 0, 0); // Início do dia útil: 6h
    const todayStart = today.getTime();
    
    // Verificar se já existe sessão hoje (após 6h)
    const existing = await query(
      useSQLite 
        ? 'SELECT * FROM work_sessions WHERE user_id = ? AND timestamp >= ? ORDER BY timestamp ASC LIMIT 1'
        : 'SELECT * FROM work_sessions WHERE user_id = $1 AND timestamp >= $2 ORDER BY timestamp ASC LIMIT 1',
      [userId, todayStart]
    );
    if (existing.length > 0) {
      const s = existing[0];
      return res.json({ id: s.id, userId: s.user_id, timestamp: parseInt(s.timestamp) });
    }
    
    // Só criar sessão se for após 6h
    await execute(
      useSQLite
        ? 'INSERT INTO work_sessions (id, user_id, timestamp) VALUES (?, ?, ?)'
        : 'INSERT INTO work_sessions (id, user_id, timestamp) VALUES ($1, $2, $3)',
      [id, userId, timestamp]
    );
    return res.json(convertNumericFields({ id, userId, timestamp }, ['timestamp']));
  } catch (error) {
    console.error('Error creating work session:', error);
    return res.status(500).json({ error: 'Erro ao criar sessão' });
  }
});

// ============ DEMANDS ============

// Função para gerar código de execução baseado no dia da semana e ordem
// Contagem: POR DESIGNER (cada designer tem sua própria sequência)
// Horário: 00:00-23:59 (dia calendário)
async function generateExecutionCode(timestamp: number, userId: string, excludeDemandId?: string): Promise<string> {
  const date = new Date(timestamp);
  const dayOfWeek = date.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  
  // Mapeamento de dias da semana
  const dayCodes: { [key: number]: string } = {
    0: 'D',   // Domingo (caso necessário)
    1: 'S',   // Segunda-feira
    2: 'T',   // Terça-feira
    3: 'QA',  // Quarta-feira
    4: 'QI',  // Quinta-feira
    5: 'SX',  // Sexta-feira
    6: 'SB'   // Sábado
  };
  
  const dayCode = dayCodes[dayOfWeek];
  if (!dayCode) {
    throw new Error('Dia da semana inválido');
  }
  
  // Calcular início e fim do dia calendário (00:00:00 até 23:59:59.999)
  // IMPORTANTE: Usar o mesmo objeto Date para garantir consistência de timezone
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  
  const startTimestamp = startOfDay.getTime();
  const endTimestamp = endOfDay.getTime();
  
  // Contar demandas do dia que foram criadas ANTES desta (timestamp menor)
  // IMPORTANTE: Contar APENAS do dia atual E APENAS do designer específico
  // Cada designer tem sua própria sequência (T1, T2, T3...)
  const startTs = Number(startTimestamp);
  const currentTs = Number(timestamp);
  
  // Query que garante: 
  // - Apenas do dia atual (startTs até endTs)
  // - Apenas do designer específico (user_id = userId)
  // - Criadas antes da atual (timestamp < currentTs)
  let countQuery = useSQLite
    ? 'SELECT COUNT(*) as count FROM demands WHERE timestamp >= ? AND timestamp <= ? AND timestamp < ? AND user_id = ?'
    : 'SELECT COUNT(*) as count FROM demands WHERE timestamp >= $1 AND timestamp <= $2 AND timestamp < $3 AND user_id = $4';
  const countParams: any[] = [startTs, endTimestamp, currentTs, userId];
  
  if (excludeDemandId) {
    countQuery += useSQLite ? ' AND id != ?' : ' AND id != $5';
    countParams.push(excludeDemandId);
  }
  
  // Debug: verificar o que está sendo contado
  const debugQuery = countQuery.replace('COUNT(*) as count', 'id, timestamp, execution_code, user_id');
  try {
    const debugResult = await query(debugQuery, countParams);
    console.log('[EXECUTION CODE] Debug - Demandas do DESIGNER no DIA ATUAL:', debugResult.length, {
      userId,
      dia: date.toLocaleDateString('pt-BR'),
      startTimestamp: startTs,
      endTimestamp: endTimestamp,
      currentTimestamp: currentTs,
      dateStart: new Date(startTs).toISOString(),
      dateEnd: new Date(endTimestamp).toISOString(),
      dateCurrent: new Date(currentTs).toISOString(),
      demands: debugResult.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        timestamp: r.timestamp,
        executionCode: r.execution_code,
        date: new Date(parseInt(r.timestamp)).toISOString()
      }))
    });
  } catch (debugError) {
    console.warn('[EXECUTION CODE] Erro no debug:', debugError);
  }
  
  const countResult = await queryOne(countQuery, countParams);
  const totalDemandsBeforeThis = parseInt(countResult?.count || '0', 10) || 0;
  const orderInDay = totalDemandsBeforeThis + 1;
  
  // Gerar código no formato {CODIGO_DO_DIA}{ORDEM_DA_DEMANDA}
  const code = `${dayCode}${orderInDay}`;
  console.log('[EXECUTION CODE] Gerado:', code, { 
    userId,
    dia: date.toLocaleDateString('pt-BR'),
    dayOfWeek, 
    dayCode, 
    totalDemandsBeforeThis, 
    orderInDay,
    startTimestamp: startTs,
    endTimestamp: endTimestamp,
    currentTimestamp: currentTs
  });
  return code;
}

// Função para reordenar códigos após exclusão
// Reordena todas as demandas do designer no dia baseado na ordem de timestamp
async function reorderExecutionCodes(deletedTimestamp: number, userId: string) {
  const date = new Date(deletedTimestamp);
  
  // Calcular início e fim do dia (garantir apenas do dia específico)
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  
  const startTimestamp = startOfDay.getTime();
  const endTimestamp = endOfDay.getTime();
  
  // Buscar todas as demandas do DESIGNER no dia ordenadas por timestamp (ordem de criação)
  // IMPORTANTE: Apenas do dia específico E apenas do designer específico
  const demandsResult = await query(
    useSQLite
      ? 'SELECT id, timestamp FROM demands WHERE timestamp >= ? AND timestamp <= ? AND user_id = ? ORDER BY timestamp ASC'
      : 'SELECT id, timestamp FROM demands WHERE timestamp >= $1 AND timestamp <= $2 AND user_id = $3 ORDER BY timestamp ASC',
    [startTimestamp, endTimestamp, userId]
  );
  
  console.log('[REORDER] Reordenando códigos para', demandsResult.length, 'demandas do designer', userId, 'no dia', date.toLocaleDateString('pt-BR'));
  
  // Reordenar códigos baseado na ordem de timestamp
  if (useSQLite && db) {
    const transaction = db.transaction(() => {
      // Reordenar códigos baseado na ordem de timestamp (ordem de criação)
      for (let i = 0; i < demandsResult.length; i++) {
        const demand = demandsResult[i];
        const demandTimestamp = parseInt(demand.timestamp);
        
        // Obter código do dia
        const dayOfWeek = new Date(demandTimestamp).getDay();
        const dayCodes: { [key: number]: string } = {
          0: 'D', 1: 'S', 2: 'T', 3: 'QA', 4: 'QI', 5: 'SX', 6: 'SB'
        };
        const dayCode = dayCodes[dayOfWeek];
        
        // Gerar código baseado na posição na ordem (i + 1)
        // A ordem já está correta porque a query ordena por timestamp ASC
        const correctCode = `${dayCode}${i + 1}`;
        
        db.prepare('UPDATE demands SET execution_code = ? WHERE id = ?').run(correctCode, demand.id);
      }
    });
    transaction();
    console.log('[EXECUTION CODE] Códigos reordenados para', demandsResult.length, 'demandas do designer', userId);
  } else {
    // PostgreSQL (comentado para desenvolvimento local)
    /*
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < demandsResult.length; i++) {
        const demand = demandsResult[i];
        const demandTimestamp = parseInt(demand.timestamp);
        const dayOfWeek = new Date(demandTimestamp).getDay();
        const dayCodes: { [key: number]: string } = {
          0: 'D', 1: 'S', 2: 'T', 3: 'QA', 4: 'QI', 5: 'SX', 6: 'SB'
        };
        const dayCode = dayCodes[dayOfWeek];
        const correctCode = `${dayCode}${i + 1}`;
        await client.query('UPDATE demands SET execution_code = $1 WHERE id = $2', [correctCode, demand.id]);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    */
  }
}

app.get('/api/demands', async (req: Request, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.query;
    let sql = 'SELECT * FROM demands WHERE 1=1';
    const params: any[] = [];
    if (userId) {
      params.push(userId);
      sql += useSQLite ? ' AND user_id = ?' : ` AND user_id = $${params.length}`;
    }
    if (startDate) {
      params.push(parseInt(startDate as string));
      sql += useSQLite ? ' AND timestamp >= ?' : ` AND timestamp >= $${params.length}`;
    }
    if (endDate) {
      params.push(parseInt(endDate as string));
      sql += useSQLite ? ' AND timestamp <= ?' : ` AND timestamp <= $${params.length}`;
    }
    sql += ' ORDER BY timestamp DESC';
    const demandsData = await query(sql, params);
    const demands = await Promise.all(demandsData.map(async (d) => {
      const itemsResult = await query(
        useSQLite ? 'SELECT * FROM demand_items WHERE demand_id = ?' : 'SELECT * FROM demand_items WHERE demand_id = $1',
        [d.id]
      );
      const demand = {
        id: d.id,
        userId: d.user_id,
        userName: d.user_name,
        items: itemsResult.map(i => convertNumericFields({
          artTypeId: i.art_type_id,
          artTypeLabel: i.art_type_label,
          pointsPerUnit: i.points_per_unit,
          quantity: i.quantity,
          variationQuantity: i.variation_quantity,
          variationPoints: i.variation_points,
          totalPoints: i.total_points
        }, ['pointsPerUnit', 'quantity', 'variationQuantity', 'variationPoints', 'totalPoints'])),
        totalQuantity: d.total_quantity,
        totalPoints: d.total_points,
        timestamp: d.timestamp,
        executionCode: d.execution_code || undefined
      };
      return convertNumericFields(demand, ['totalQuantity', 'totalPoints', 'timestamp']);
    }));
    return res.json(demands);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar demandas' });
  }
});

app.post('/api/demands', async (req: Request, res: Response) => {
  try {
    const { userId, userName, items, totalQuantity, totalPoints } = req.body;
    const id = `demand-${Date.now()}`;
    const timestamp = Date.now();
    
    // Gerar código de execução ANTES de iniciar a transação
    // IMPORTANTE: Passar userId para contar apenas demandas deste designer
    let executionCode: string | null = null;
    try {
      executionCode = await generateExecutionCode(timestamp, userId);
    } catch (codeError: any) {
      console.warn('[CREATE DEMAND] Erro ao gerar código de execução:', codeError?.message);
      // Continuar sem código se houver erro
    }
    
    if (useSQLite && db) {
      const transaction = db.transaction(() => {
        // Inserir demanda com código de execução (se existir)
        try {
          if (executionCode) {
            db.prepare(
              'INSERT INTO demands (id, user_id, user_name, total_quantity, total_points, timestamp, execution_code) VALUES (?, ?, ?, ?, ?, ?, ?)'
            ).run(id, userId, userName, totalQuantity, totalPoints, timestamp, executionCode);
          } else {
            db.prepare(
              'INSERT INTO demands (id, user_id, user_name, total_quantity, total_points, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(id, userId, userName, totalQuantity, totalPoints, timestamp);
          }
        } catch (insertError: any) {
          // Se a coluna execution_code não existir, inserir sem ela
          if (insertError?.message?.includes('no such column: execution_code')) {
            console.warn('[CREATE DEMAND] Coluna execution_code não existe, inserindo sem código');
            db.prepare(
              'INSERT INTO demands (id, user_id, user_name, total_quantity, total_points, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(id, userId, userName, totalQuantity, totalPoints, timestamp);
            executionCode = null;
          } else {
            throw insertError;
          }
        }
        
        for (const item of items) {
          db.prepare(
            'INSERT INTO demand_items (demand_id, art_type_id, art_type_label, points_per_unit, quantity, variation_quantity, variation_points, total_points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).run(id, item.artTypeId, item.artTypeLabel, item.pointsPerUnit, item.quantity, item.variationQuantity || 0, item.variationPoints || 0, item.totalPoints);
        }
      });
      transaction();
    } else {
      // PostgreSQL (comentado para desenvolvimento local)
      /*
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        if (executionCode) {
          await client.query(
            'INSERT INTO demands (id, user_id, user_name, total_quantity, total_points, timestamp, execution_code) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [id, userId, userName, totalQuantity, totalPoints, timestamp, executionCode]
          );
        } else {
          await client.query(
            'INSERT INTO demands (id, user_id, user_name, total_quantity, total_points, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, userId, userName, totalQuantity, totalPoints, timestamp]
          );
        }
        for (const item of items) {
          await client.query(
            'INSERT INTO demand_items (demand_id, art_type_id, art_type_label, points_per_unit, quantity, variation_quantity, variation_points, total_points) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [id, item.artTypeId, item.artTypeLabel, item.pointsPerUnit, item.quantity, item.variationQuantity || 0, item.variationPoints || 0, item.totalPoints]
          );
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      */
    }
    
    const response: any = { 
      id, 
      userId, 
      userName, 
      items: items.map((item: any) => convertNumericFields(item, ['pointsPerUnit', 'quantity', 'variationQuantity', 'variationPoints', 'totalPoints'])), 
      totalQuantity, 
      totalPoints, 
      timestamp 
    };
    if (executionCode) {
      response.executionCode = executionCode;
    }
    
    return res.json(convertNumericFields(response, ['totalQuantity', 'totalPoints', 'timestamp']));
  } catch (error) {
    console.error('[CREATE DEMAND] Erro:', error);
    return res.status(500).json({ error: 'Erro ao criar demanda' });
  }
});

app.put('/api/demands/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { items, totalQuantity, totalPoints } = req.body;
    
    // Buscar demanda atual para obter timestamp e userId
    const currentDemand = await queryOne(
      useSQLite ? 'SELECT timestamp, user_id FROM demands WHERE id = ?' : 'SELECT timestamp, user_id FROM demands WHERE id = $1',
      [id]
    );
    if (!currentDemand) {
      return res.status(404).json({ error: 'Demanda não encontrada' });
    }
    
    const timestamp = Number(currentDemand.timestamp);
    const demandUserId = currentDemand.user_id;
    
    // Recalcular código de execução (código muda ao editar)
    // IMPORTANTE: Passar userId para contar apenas demandas deste designer
    let executionCode: string | null = null;
    try {
      executionCode = await generateExecutionCode(timestamp, demandUserId, id);
    } catch (codeError: any) {
      console.warn('[UPDATE DEMAND] Erro ao recalcular código de execução:', codeError?.message);
    }
    
    if (useSQLite && db) {
      const transaction = db.transaction(() => {
        // Atualizar dados da demanda (incluindo código se existir)
        if (executionCode) {
          try {
            db.prepare(
              'UPDATE demands SET total_quantity = ?, total_points = ?, execution_code = ? WHERE id = ?'
            ).run(totalQuantity, totalPoints, executionCode, id);
          } catch (updateError: any) {
            // Se coluna não existir, atualizar sem código
            if (updateError.message?.includes('no such column')) {
              db.prepare(
                'UPDATE demands SET total_quantity = ?, total_points = ? WHERE id = ?'
              ).run(totalQuantity, totalPoints, id);
            } else {
              throw updateError;
            }
          }
        } else {
          db.prepare(
            'UPDATE demands SET total_quantity = ?, total_points = ? WHERE id = ?'
          ).run(totalQuantity, totalPoints, id);
        }
        
        // Remover itens antigos
        db.prepare('DELETE FROM demand_items WHERE demand_id = ?').run(id);
        
        // Inserir novos itens
        const insertItem = db.prepare(
          'INSERT INTO demand_items (demand_id, art_type_id, art_type_label, points_per_unit, quantity, variation_quantity, variation_points, total_points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        for (const item of items) {
          insertItem.run(
            id, item.artTypeId, item.artTypeLabel, item.pointsPerUnit, item.quantity, item.variationQuantity || 0, item.variationPoints || 0, item.totalPoints
          );
        }
      });
      
      transaction();
    } else {
      // PostgreSQL (comentado para desenvolvimento local)
      /*
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        if (executionCode) {
          try {
            await client.query(
              'UPDATE demands SET total_quantity = $1, total_points = $2, execution_code = $3 WHERE id = $4',
              [totalQuantity, totalPoints, executionCode, id]
            );
          } catch (updateError: any) {
            if (updateError?.code === '42703') {
              await client.query(
                'UPDATE demands SET total_quantity = $1, total_points = $2 WHERE id = $3',
                [totalQuantity, totalPoints, id]
              );
            } else {
              throw updateError;
            }
          }
        } else {
          await client.query(
            'UPDATE demands SET total_quantity = $1, total_points = $2 WHERE id = $3',
            [totalQuantity, totalPoints, id]
          );
        }
        
        await client.query('DELETE FROM demand_items WHERE demand_id = $1', [id]);
        
        for (const item of items) {
          await client.query(
            'INSERT INTO demand_items (demand_id, art_type_id, art_type_label, points_per_unit, quantity, variation_quantity, variation_points, total_points) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [id, item.artTypeId, item.artTypeLabel, item.pointsPerUnit, item.quantity, item.variationQuantity || 0, item.variationPoints || 0, item.totalPoints]
          );
        }
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      */
    }
    
    // Buscar demanda atualizada
    const demand = await queryOne(
      useSQLite ? 'SELECT * FROM demands WHERE id = ?' : 'SELECT * FROM demands WHERE id = $1',
      [id]
    );
    if (!demand) {
      return res.status(404).json({ error: 'Demanda não encontrada' });
    }
    
    const demandItems = await query(
      useSQLite ? 'SELECT * FROM demand_items WHERE demand_id = ?' : 'SELECT * FROM demand_items WHERE demand_id = $1',
      [id]
    );
    
    return res.json(convertNumericFields({
      id: demand.id,
      userId: demand.user_id,
      userName: demand.user_name,
      items: demandItems.map(i => ({
        artTypeId: i.art_type_id,
        artTypeLabel: i.art_type_label,
        pointsPerUnit: i.points_per_unit,
        quantity: i.quantity,
        variationQuantity: i.variation_quantity,
        variationPoints: i.variation_points,
        totalPoints: i.total_points
      })),
      totalQuantity: demand.total_quantity,
      totalPoints: demand.total_points,
      timestamp: demand.timestamp,
      executionCode: demand.execution_code || undefined
    }, ['pointsPerUnit', 'quantity', 'variationQuantity', 'variationPoints', 'totalPoints', 'totalQuantity', 'totalPoints', 'timestamp']));
  } catch (error) {
    console.error('[UPDATE DEMAND] Erro:', error);
    return res.status(500).json({ error: 'Erro ao atualizar demanda' });
  }
});

app.delete('/api/demands/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Buscar timestamp e userId da demanda antes de deletar (para reordenar códigos)
    const demand = await queryOne(
      useSQLite ? 'SELECT timestamp, user_id FROM demands WHERE id = ?' : 'SELECT timestamp, user_id FROM demands WHERE id = $1',
      [id]
    );
    const deletedTimestamp = demand ? Number(demand.timestamp) : null;
    const deletedUserId = demand ? demand.user_id : null;
    
    if (useSQLite && db) {
      const transaction = db.transaction(() => {
        db.prepare('DELETE FROM demand_items WHERE demand_id = ?').run(id);
        db.prepare('DELETE FROM demands WHERE id = ?').run(id);
      });
      transaction();
    } else {
      // PostgreSQL (comentado para desenvolvimento local)
      /*
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM demand_items WHERE demand_id = $1', [id]);
        await client.query('DELETE FROM demands WHERE id = $1', [id]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      */
    }
    
    // Reordenar códigos após exclusão (se timestamp e userId existem)
    // IMPORTANTE: Reordenar apenas as demandas do designer específico
    if (deletedTimestamp && deletedUserId) {
      try {
        await reorderExecutionCodes(deletedTimestamp, deletedUserId);
      } catch (reorderError) {
        console.error('[DELETE DEMAND] Erro ao reordenar códigos:', reorderError);
        // Não falhar a exclusão se a reordenação falhar
      }
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('[DELETE DEMAND] Erro:', error);
    return res.status(500).json({ error: 'Erro ao remover demanda' });
  }
});

// ============ FEEDBACKS ============
app.get('/api/feedbacks', async (req: Request, res: Response) => {
  try {
    const { designerId } = req.query;
    let sql = 'SELECT * FROM feedbacks';
    const params: any[] = [];
    if (designerId) {
      params.push(designerId);
      sql += useSQLite ? ' WHERE designer_id = ?' : ` WHERE designer_id = $${params.length}`;
    }
    sql += ' ORDER BY created_at DESC';
    const feedbacks = await query(sql, params);
    const converted = convertNumericFieldsInArray(feedbacks.map(f => {
      // SQLite armazena image_urls como JSON string, precisa fazer parse
      let imageUrls = [];
      try {
        if (typeof f.image_urls === 'string') {
          imageUrls = f.image_urls ? JSON.parse(f.image_urls) : [];
        } else if (Array.isArray(f.image_urls)) {
          imageUrls = f.image_urls;
        }
      } catch (parseError) {
        console.warn('Erro ao fazer parse de image_urls:', parseError);
        imageUrls = [];
      }
      
      return {
        id: f.id,
        designerId: f.designer_id,
        designerName: f.designer_name,
        adminName: f.admin_name,
        imageUrls,
        comment: f.comment,
        createdAt: f.created_at,
        viewed: f.viewed === 1 || f.viewed === '1' || f.viewed === true,
        viewedAt: f.viewed_at || undefined,
        response: f.response || undefined,
        responseAt: f.response_at || undefined
      };
    }), ['createdAt', 'viewedAt', 'responseAt']);
    return res.json(converted);
  } catch (error: any) {
    // Se a tabela não existe, retornar array vazio
    if (error.message?.includes('no such table') || error.code === '42P01') {
      return res.json([]);
    }
    console.error('Erro ao buscar feedbacks:', error);
    return res.status(500).json({ error: 'Erro ao buscar feedbacks' });
  }
});

app.post('/api/feedbacks', async (req: Request, res: Response) => {
  try {
    const { designerId, designerName, adminName, imageUrls, comment } = req.body;
    const id = `feedback-${Date.now()}`;
    const createdAt = Date.now();
    
    // SQLite precisa armazenar array como JSON string
    const imageUrlsJson = Array.isArray(imageUrls) ? JSON.stringify(imageUrls) : (imageUrls || '[]');
    
    await execute(
      useSQLite
        ? 'INSERT INTO feedbacks (id, designer_id, designer_name, admin_name, image_urls, comment, created_at, viewed) VALUES (?, ?, ?, ?, ?, ?, ?, 0)'
        : 'INSERT INTO feedbacks (id, designer_id, designer_name, admin_name, image_urls, comment, created_at, viewed) VALUES ($1, $2, $3, $4, $5, $6, $7, false)',
      [id, designerId, designerName, adminName, imageUrlsJson, comment || null, createdAt]
    );
    return res.json(convertNumericFields({ id, designerId, designerName, adminName, imageUrls: Array.isArray(imageUrls) ? imageUrls : (imageUrls ? JSON.parse(imageUrls) : []), comment, createdAt, viewed: false }, ['createdAt']));
  } catch (error: any) {
    console.error('Erro ao criar feedback:', error);
    return res.status(500).json({ error: 'Erro ao criar feedback', details: error?.message });
  }
});

app.put('/api/feedbacks/:id/view', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const viewedAt = Date.now();
    await execute(
      useSQLite
        ? 'UPDATE feedbacks SET viewed = 1, viewed_at = ? WHERE id = ?'
        : 'UPDATE feedbacks SET viewed = true, viewed_at = $1 WHERE id = $2',
      [viewedAt, id]
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao marcar como visto' });
  }
});

app.put('/api/feedbacks/:id/response', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    const responseAt = Date.now();
    await execute(
      useSQLite
        ? 'UPDATE feedbacks SET response = ?, response_at = ? WHERE id = ?'
        : 'UPDATE feedbacks SET response = $1, response_at = $2 WHERE id = $3',
      [response, responseAt, id]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao responder feedback' });
  }
});

app.delete('/api/feedbacks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await execute(
      useSQLite ? 'DELETE FROM feedbacks WHERE id = ?' : 'DELETE FROM feedbacks WHERE id = $1',
      [id]
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover feedback' });
  }
});

// ============ LESSONS ============
app.get('/api/lessons', async (req: Request, res: Response) => {
  try {
    const lessons = await query('SELECT * FROM lessons ORDER BY order_index');
    const converted = convertNumericFieldsInArray(lessons.map(l => ({
      id: l.id,
      title: l.title,
      description: l.description,
      videoUrl: l.video_url,
      orderIndex: l.order_index,
      createdAt: l.created_at
    })), ['orderIndex', 'createdAt']);
    return res.json(converted);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar aulas' });
  }
});

app.post('/api/lessons', async (req: Request, res: Response) => {
  try {
    const { title, description, videoUrl } = req.body;
    const id = `lesson-${Date.now()}`;
    const createdAt = Date.now();
    const maxOrderResult = await queryOne('SELECT COALESCE(MAX(order_index), -1) + 1 as next FROM lessons');
    const orderIndex = Number(maxOrderResult?.next || 0);
    await execute(
      useSQLite
        ? 'INSERT INTO lessons (id, title, description, video_url, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        : 'INSERT INTO lessons (id, title, description, video_url, order_index, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, title, description || '', videoUrl, orderIndex, createdAt]
    );
    return res.json(convertNumericFields({ id, title, description, videoUrl, orderIndex, createdAt }, ['orderIndex', 'createdAt']));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar aula' });
  }
});

app.put('/api/lessons/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, videoUrl, orderIndex } = req.body;
    
    // Construir query dinamicamente para SQLite
    const updates: string[] = [];
    const params: any[] = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (videoUrl !== undefined) {
      updates.push('video_url = ?');
      params.push(videoUrl);
    }
    if (orderIndex !== undefined) {
      updates.push('order_index = ?');
      params.push(orderIndex);
    }
    
    if (updates.length > 0) {
      params.push(id);
      await execute(
        `UPDATE lessons SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }
    
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar aula' });
  }
});

app.delete('/api/lessons/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await execute(
      useSQLite ? 'DELETE FROM lessons WHERE id = ?' : 'DELETE FROM lessons WHERE id = $1',
      [id]
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover aula' });
  }
});

// ============ LESSON PROGRESS ============
app.get('/api/lesson-progress/:designerId', async (req: Request, res: Response) => {
  try {
    const { designerId } = req.params;
    const progress = await query(
      useSQLite ? 'SELECT * FROM lesson_progress WHERE designer_id = ?' : 'SELECT * FROM lesson_progress WHERE designer_id = $1',
      [designerId]
    );
    const converted = convertNumericFieldsInArray(progress.map(p => ({
      id: p.id,
      lessonId: p.lesson_id,
      designerId: p.designer_id,
      viewed: p.viewed,
      viewedAt: p.viewed_at || undefined
    })), ['viewedAt']);
    return res.json(converted);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar progresso' });
  }
});

app.post('/api/lesson-progress', async (req: Request, res: Response) => {
  try {
    const { lessonId, designerId } = req.body;
    const id = `progress-${Date.now()}`;
    const viewedAt = Date.now();
    
    // SQLite não tem ON CONFLICT da mesma forma, então vamos fazer um INSERT OR REPLACE
    if (useSQLite && db) {
      // Verificar se já existe
      const existing = await queryOne(
        'SELECT id FROM lesson_progress WHERE lesson_id = ? AND designer_id = ?',
        [lessonId, designerId]
      );
      
      if (existing) {
        await execute(
          'UPDATE lesson_progress SET viewed = 1, viewed_at = ? WHERE lesson_id = ? AND designer_id = ?',
          [viewedAt, lessonId, designerId]
        );
      } else {
        await execute(
          'INSERT INTO lesson_progress (id, lesson_id, designer_id, viewed, viewed_at) VALUES (?, ?, ?, 1, ?)',
          [id, lessonId, designerId, viewedAt]
        );
      }
    } else {
      // PostgreSQL (comentado para desenvolvimento local)
      /*
      await pool.query(
        'INSERT INTO lesson_progress (id, lesson_id, designer_id, viewed, viewed_at) VALUES ($1, $2, $3, true, $4) ON CONFLICT (lesson_id, designer_id) DO UPDATE SET viewed = true, viewed_at = $4',
        [id, lessonId, designerId, viewedAt]
      );
      */
    }
    
    return res.json(convertNumericFields({ id, lessonId, designerId, viewed: true, viewedAt }, ['viewedAt']));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao salvar progresso' });
  }
});

app.delete('/api/lesson-progress/:lessonId/:designerId', async (req: Request, res: Response) => {
  try {
    const { lessonId, designerId } = req.params;
    await execute(
      useSQLite
        ? 'DELETE FROM lesson_progress WHERE lesson_id = ? AND designer_id = ?'
        : 'DELETE FROM lesson_progress WHERE lesson_id = $1 AND designer_id = $2',
      [lessonId, designerId]
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover progresso' });
  }
});

// ============ SETTINGS ============
app.get('/api/settings', async (req: Request, res: Response) => {
  try {
    const result = await queryOne('SELECT * FROM system_settings WHERE id = 1');
    if (!result) {
      return res.json({});
    }
    const s = result;
    const settings = {
      logoUrl: s.logo_url,
      brandTitle: s.brand_title,
      loginSubtitle: s.login_subtitle,
      variationPoints: s.variation_points,
      dailyArtGoal: s.daily_art_goal !== null && s.daily_art_goal !== undefined ? s.daily_art_goal : 8,
      motivationalMessage: s.motivational_message || null,
      motivationalMessageEnabled: s.motivational_message_enabled || false,
      nextAwardImage: s.next_award_image || null,
      chartEnabled: s.chart_enabled !== undefined ? s.chart_enabled : true,
      showAwardsChart: s.show_awards_chart !== undefined ? s.show_awards_chart : false,
      awardsHasUpdates: s.awards_has_updates === true || s.awards_has_updates === 'true' || s.awards_has_updates === 1,
      faviconUrl: s.favicon_url || null
    };
    return res.json(convertNumericFields(settings, ['variationPoints', 'dailyArtGoal']));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

app.put('/api/settings', async (req: Request, res: Response) => {
  try {
    const { 
      logoUrl, 
      brandTitle, 
      loginSubtitle, 
      variationPoints,
      dailyArtGoal,
      motivationalMessage,
      motivationalMessageEnabled,
      nextAwardImage,
      chartEnabled,
      showAwardsChart,
      awardsHasUpdates,
      faviconUrl
    } = req.body;

    // Verificar e criar colunas se não existirem (apenas para SQLite, PostgreSQL usa IF NOT EXISTS)
    if (useSQLite && db) {
      try {
        // SQLite não tem IF NOT EXISTS para ALTER TABLE, então vamos tentar e ignorar erro se já existir
        const columns = [
          { name: 'daily_art_goal', sql: 'ALTER TABLE system_settings ADD COLUMN daily_art_goal INTEGER DEFAULT 8' },
          { name: 'motivational_message', sql: 'ALTER TABLE system_settings ADD COLUMN motivational_message TEXT' },
          { name: 'motivational_message_enabled', sql: 'ALTER TABLE system_settings ADD COLUMN motivational_message_enabled INTEGER DEFAULT 0' },
          { name: 'next_award_image', sql: 'ALTER TABLE system_settings ADD COLUMN next_award_image TEXT' },
          { name: 'chart_enabled', sql: 'ALTER TABLE system_settings ADD COLUMN chart_enabled INTEGER DEFAULT 1' },
          { name: 'show_awards_chart', sql: 'ALTER TABLE system_settings ADD COLUMN show_awards_chart INTEGER DEFAULT 0' },
          { name: 'awards_has_updates', sql: 'ALTER TABLE system_settings ADD COLUMN awards_has_updates INTEGER DEFAULT 0' },
          { name: 'favicon_url', sql: 'ALTER TABLE system_settings ADD COLUMN favicon_url TEXT' }
        ];
        for (const col of columns) {
          try {
            db.prepare(col.sql).run();
          } catch (colError: any) {
            // Ignorar erro se coluna já existir
            if (!colError.message?.includes('duplicate column')) {
              console.warn(`Erro ao criar coluna ${col.name}:`, colError.message);
            }
          }
        }
      } catch (colError) {
        console.error('Erro ao verificar/criar colunas:', colError);
      }
    } else {
      // PostgreSQL (comentado para desenvolvimento local)
      /*
      try {
        await pool.query(`
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'system_settings' AND column_name = 'daily_art_goal'
            ) THEN
              ALTER TABLE system_settings ADD COLUMN daily_art_goal INTEGER DEFAULT 8;
            END IF;
          END $$;
        `);
      } catch (colError) {
        console.error('Erro ao verificar/criar coluna daily_art_goal:', colError);
      }
      */
    }
    
    // Se houver alterações relacionadas a premiações, ativar flag de atualizações
    const hasAwardRelatedChanges = 
      motivationalMessage !== undefined ||
      motivationalMessageEnabled !== undefined ||
      nextAwardImage !== undefined ||
      chartEnabled !== undefined ||
      showAwardsChart !== undefined;
    
    // Atualizar campos existentes e novos campos
    // Para dailyArtGoal e variationPoints, usar valor explícito se fornecido
    const dailyArtGoalValue = dailyArtGoal !== undefined && dailyArtGoal !== null ? Number(dailyArtGoal) : undefined;
    const variationPointsValue = variationPoints !== undefined && variationPoints !== null ? Number(variationPoints) : undefined;
    
    console.log('Valores a serem salvos:', { 
      dailyArtGoal: dailyArtGoal, 
      dailyArtGoalValue, 
      variationPoints, 
      variationPointsValue 
    });
    
    // Construir query dinamicamente para atualizar apenas os campos fornecidos
    const updates: string[] = [];
    const values: any[] = [];
    
    if (logoUrl !== undefined) {
      updates.push(useSQLite ? 'logo_url = ?' : `logo_url = $${values.length + 1}`);
      values.push(logoUrl);
    }
    if (brandTitle !== undefined) {
      updates.push(useSQLite ? 'brand_title = ?' : `brand_title = $${values.length + 1}`);
      values.push(brandTitle);
    }
    if (loginSubtitle !== undefined) {
      updates.push(useSQLite ? 'login_subtitle = ?' : `login_subtitle = $${values.length + 1}`);
      values.push(loginSubtitle);
    }
    if (variationPointsValue !== undefined) {
      updates.push(useSQLite ? 'variation_points = ?' : `variation_points = $${values.length + 1}`);
      values.push(variationPointsValue);
    }
    if (dailyArtGoalValue !== undefined) {
      updates.push(useSQLite ? 'daily_art_goal = ?' : `daily_art_goal = $${values.length + 1}`);
      values.push(dailyArtGoalValue);
    }
    if (motivationalMessage !== undefined) {
      updates.push(useSQLite ? 'motivational_message = ?' : `motivational_message = $${values.length + 1}`);
      values.push(motivationalMessage);
    }
    if (motivationalMessageEnabled !== undefined) {
      updates.push(useSQLite ? 'motivational_message_enabled = ?' : `motivational_message_enabled = $${values.length + 1}`);
      values.push(motivationalMessageEnabled ? 1 : 0);
    }
    if (nextAwardImage !== undefined) {
      updates.push(useSQLite ? 'next_award_image = ?' : `next_award_image = $${values.length + 1}`);
      values.push(nextAwardImage);
    }
    if (chartEnabled !== undefined) {
      updates.push(useSQLite ? 'chart_enabled = ?' : `chart_enabled = $${values.length + 1}`);
      values.push(chartEnabled ? 1 : 0);
    }
    if (showAwardsChart !== undefined) {
      updates.push(useSQLite ? 'show_awards_chart = ?' : `show_awards_chart = $${values.length + 1}`);
      values.push(showAwardsChart ? 1 : 0);
    }
    if (awardsHasUpdates !== undefined) {
      updates.push(useSQLite ? 'awards_has_updates = ?' : `awards_has_updates = $${values.length + 1}`);
      values.push(awardsHasUpdates ? 1 : 0);
    }
    if (faviconUrl !== undefined) {
      updates.push(useSQLite ? 'favicon_url = ?' : `favicon_url = $${values.length + 1}`);
      values.push(faviconUrl);
    }
    
    if (updates.length === 0) {
      return res.json({ success: true, message: 'Nenhuma alteração para salvar' });
    }
    
    const query = `UPDATE system_settings SET ${updates.join(', ')} WHERE id = 1`;
    console.log('Query SQL:', query);
    console.log('Valores:', values);
    
    await execute(query, values);
    
    // Verificar o valor salvo
    try {
      const verifyResult = await queryOne('SELECT daily_art_goal, variation_points, favicon_url FROM system_settings WHERE id = 1');
      console.log('Valores salvos no banco:', { 
        daily_art_goal: verifyResult?.daily_art_goal, 
        variation_points: verifyResult?.variation_points,
        favicon_url: verifyResult?.favicon_url ? 'presente' : 'ausente'
      });
    } catch (verifyError) {
      console.error('Erro ao verificar valores salvos:', verifyError);
    }
    
    // Se houver alterações relacionadas a premiações, ativar flag (exceto se awardsHasUpdates for explicitamente false)
    if (hasAwardRelatedChanges && awardsHasUpdates !== false) {
      try {
        await execute(
          useSQLite ? 'UPDATE system_settings SET awards_has_updates = 1 WHERE id = 1' : 'UPDATE system_settings SET awards_has_updates = true WHERE id = 1',
          []
        );
      } catch (updateError) {
        console.error('Erro ao atualizar flag de atualizações:', updateError);
      }
    }
    
    return res.json({ success: true });
  } catch (error: any) {
    // SQLite não precisa de tratamento especial para colunas faltantes (já criadas automaticamente)
    // PostgreSQL (comentado para desenvolvimento local)
    // if (error.code === '42703') { ... }
    console.error('Erro ao atualizar configurações:', error);
    return res.status(500).json({ error: 'Erro ao atualizar configurações', details: error.message });
  }
});

// ============ AWARDS ============
app.get('/api/awards', async (req: Request, res: Response) => {
  try {
    const awards = await query('SELECT * FROM awards ORDER BY created_at DESC');
    const converted = convertNumericFieldsInArray(awards.map(a => ({
      id: a.id,
      designerId: a.designer_id,
      designerName: a.designer_name,
      month: a.month,
      description: a.description,
      imageUrl: a.image_url,
      createdAt: a.created_at
    })), ['createdAt']);
    return res.json(converted);
  } catch (error: any) {
    console.error('Erro ao buscar premiações:', error);
    // Se a tabela não existe, retornar array vazio em vez de erro
    if (error.message?.includes('no such table') || error.code === '42P01') {
      console.warn('Tabela awards não encontrada. Retornando array vazio.');
      return res.json([]);
    }
    return res.status(500).json({ error: 'Erro ao buscar premiações', details: error.message });
  }
});

app.post('/api/awards', async (req: Request, res: Response) => {
  try {
    console.log('Recebendo requisição para criar premiação:', req.body);
    const { designerId, designerName, month, description, imageUrl } = req.body;
    
    // Validação básica
    if (!designerId || !designerName || !month) {
      console.error('Campos obrigatórios faltando:', { designerId, designerName, month });
      return res.status(400).json({ error: 'Campos obrigatórios: designerId, designerName, month' });
    }
    
    // Verificar se o designer existe (para validar foreign key)
    try {
      const userCheck = await queryOne(
        useSQLite ? 'SELECT id FROM users WHERE id = ?' : 'SELECT id FROM users WHERE id = $1',
        [designerId]
      );
      if (!userCheck) {
        console.error('Designer não encontrado:', designerId);
        return res.status(400).json({ error: 'Designer não encontrado no banco de dados' });
      }
    } catch (checkError: any) {
      console.error('Erro ao verificar designer:', checkError);
      return res.status(500).json({ 
        error: 'Erro ao verificar designer',
        details: checkError.message 
      });
    }
    
    const id = `award-${Date.now()}`;
    const createdAt = Date.now();
    
    console.log('Tentando inserir premiação:', { id, designerId, designerName, month, createdAt });
    
    try {
      if (useSQLite && db) {
        // SQLite: inserir e depois buscar
        db.prepare(
          'INSERT INTO awards (id, designer_id, designer_name, month, description, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(id, designerId, designerName, month, description || '', imageUrl || null, createdAt);
        
        const inserted = await queryOne(
          'SELECT * FROM awards WHERE id = ?',
          [id]
        );
        
        if (!inserted) {
          throw new Error('Premiação inserida mas não encontrada');
        }
        
        console.log('Premiação inserida com sucesso:', inserted);
        
        // Ativar flag de atualizações
        try {
          await execute('UPDATE system_settings SET awards_has_updates = 1 WHERE id = 1', []);
        } catch (updateError) {
          console.error('Erro ao atualizar flag de atualizações:', updateError);
        }
        
        return res.json(convertNumericFields({ 
          id: inserted.id, 
          designerId: inserted.designer_id, 
          designerName: inserted.designer_name, 
          month: inserted.month, 
          description: inserted.description || '', 
          imageUrl: inserted.image_url || null, 
          createdAt: inserted.created_at 
        }, ['createdAt']));
      } else {
        // PostgreSQL (comentado para desenvolvimento local)
        /*
        const result = await pool.query(
          'INSERT INTO awards (id, designer_id, designer_name, month, description, image_url, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
          [id, designerId, designerName, month, description || '', imageUrl || null, createdAt]
        );
        
        const inserted = result.rows[0];
        return res.json({ 
          id: inserted.id, 
          designerId: inserted.designer_id, 
          designerName: inserted.designer_name, 
          month: inserted.month, 
          description: inserted.description || '', 
          imageUrl: inserted.image_url || null, 
          createdAt: parseInt(inserted.created_at) 
        });
        */
        throw new Error('PostgreSQL não disponível em desenvolvimento local');
      }
    } catch (dbError: any) {
      // Erro específico do banco de dados
      console.error('Erro SQL ao criar premiação:', {
        code: dbError.code,
        message: dbError.message,
        detail: dbError.detail,
        constraint: dbError.constraint
      });
      
      // Verificar se é erro de tabela não encontrada
      if (dbError.message?.includes('no such table') || dbError.code === '42P01') {
        return res.status(500).json({ 
          error: 'Tabela awards não encontrada no banco de dados',
          details: 'Execute o SQL de criação da tabela awards no seu banco de dados. Código do erro: 42P01'
        });
      }
      
      // Verificar se é erro de foreign key (SQLite: SQLITE_CONSTRAINT_FOREIGNKEY)
      if (dbError.code === '23503' || dbError.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        return res.status(400).json({ 
          error: 'Designer inválido',
          details: `O designer selecionado não existe no banco de dados. Código do erro: ${dbError.code}. Detalhes: ${dbError.message}`
        });
      }
      
      // Verificar se é erro de constraint (SQLite: SQLITE_CONSTRAINT_UNIQUE)
      if (dbError.code === '23505' || dbError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ 
          error: 'Premiação duplicada',
          details: `Já existe uma premiação com esses dados. Código do erro: ${dbError.code}`
        });
      }
      
      return res.status(500).json({ 
        error: 'Erro ao criar premiação no banco de dados',
        details: `Código: ${dbError.code || 'N/A'}, Mensagem: ${dbError.message || 'Erro desconhecido'}`
      });
    }
  } catch (error: any) {
    console.error('Erro geral ao criar premiação:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar requisição',
      details: error?.message || 'Erro desconhecido no servidor'
    });
  }
});

app.delete('/api/awards/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await execute(
      useSQLite ? 'DELETE FROM awards WHERE id = ?' : 'DELETE FROM awards WHERE id = $1',
      [id]
    );
    
    // Ativar flag de atualizações
    try {
      await execute(
        useSQLite ? 'UPDATE system_settings SET awards_has_updates = 1 WHERE id = 1' : 'UPDATE system_settings SET awards_has_updates = true WHERE id = 1',
        []
      );
    } catch (updateError) {
      console.error('Erro ao atualizar flag de atualizações:', updateError);
    }
    
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover premiação' });
  }
});

// Rota para resetar flag de atualizações de premiações
app.put('/api/awards/reset-updates', async (req: Request, res: Response) => {
  try {
    await execute(
      useSQLite ? 'UPDATE system_settings SET awards_has_updates = 0 WHERE id = 1' : 'UPDATE system_settings SET awards_has_updates = false WHERE id = 1',
      []
    );
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao resetar flag de atualizações:', error);
    return res.status(500).json({ error: 'Erro ao resetar flag de atualizações' });
  }
});

// Rota para buscar dados do gráfico de premiações (pontos por designer no mês atual)
app.get('/api/awards/chart-data', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    // Buscar todos os designers ativos
    const designersResult = await query(
      useSQLite
        ? "SELECT id, name, avatar_color, avatar_url FROM users WHERE role = 'DESIGNER' AND (active = 1 OR active = 't' OR active = 'true')"
        : 'SELECT id, name, avatar_color, avatar_url FROM users WHERE role = $1 AND active = true',
      useSQLite ? [] : ['DESIGNER']
    );

    // Buscar demandas do mês atual
    const demandsResult = await query(
      useSQLite
        ? 'SELECT user_id, total_points FROM demands WHERE timestamp >= ? AND timestamp <= ?'
        : 'SELECT user_id, total_points FROM demands WHERE timestamp >= $1 AND timestamp <= $2',
      [currentMonthStart, currentMonthEnd]
    );

    // Agrupar pontos por designer
    const pointsByDesigner: Record<string, number> = {};
    demandsResult.forEach((demand: any) => {
      const userId = demand.user_id;
      const totalPoints = Number(demand.total_points) || 0;
      if (!pointsByDesigner[userId]) {
        pointsByDesigner[userId] = 0;
      }
      pointsByDesigner[userId] += totalPoints;
    });

    // Montar resposta com dados formatados
    const chartData = designersResult
      .map((designer: any) => {
        const shortName = designer.name.split(' - ')[1] || designer.name.split(' ')[0];
        let color = designer.avatar_color;
        if (!color && designer.avatar_url) {
          const bgMatch = designer.avatar_url.match(/background=([a-fA-F0-9]{6})/);
          if (bgMatch) color = `#${bgMatch[1]}`;
        }
        if (!color) {
          const colors = ['#4F46E5', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];
          const index = designersResult.findIndex((d: any) => d.id === designer.id);
          color = colors[index % colors.length];
        }

        return {
          name: shortName,
          totalPoints: Number(pointsByDesigner[designer.id] || 0),
          color: color
        };
      })
      .filter((item: any) => item.totalPoints > 0) // Apenas designers com pontos
      .sort((a: any, b: any) => b.totalPoints - a.totalPoints); // Ordenar por pontos (maior para menor)

    return res.json(chartData);
  } catch (error: any) {
    console.error('Erro ao buscar dados do gráfico de premiações:', error);
    return res.status(500).json({ error: 'Erro ao buscar dados do gráfico', details: error.message });
  }
});

// ============ USEFUL LINKS ============
app.get('/api/useful-links', async (req: Request, res: Response) => {
  try {
    const linksData = await query('SELECT * FROM useful_links ORDER BY created_at DESC');
    const links = convertNumericFieldsInArray(linksData.map(l => ({
      id: l.id,
      title: l.title,
      url: l.url,
      imageUrl: l.image_url,
      createdAt: l.created_at,
      tags: [] // Será preenchido abaixo
    })), ['createdAt']);
    
    // Buscar tags para cada link
    for (const link of links) {
      try {
        const tagsResult = await query(
          useSQLite
            ? `SELECT t.id, t.name, t.color, t.created_at 
               FROM tags t 
               INNER JOIN link_tags lt ON t.id = lt.tag_id 
               WHERE lt.link_id = ? 
               ORDER BY t.name ASC`
            : `SELECT t.id, t.name, t.color, t.created_at 
               FROM tags t 
               INNER JOIN link_tags lt ON t.id = lt.tag_id 
               WHERE lt.link_id = $1 
               ORDER BY t.name ASC`,
          [link.id]
        );
        link.tags = convertNumericFieldsInArray(tagsResult.map(t => ({
          id: t.id,
          name: t.name,
          color: t.color || null,
          createdAt: t.created_at
        })), ['createdAt']);
      } catch (tagError: any) {
        // Se a tabela não existe, retornar array vazio
        if (tagError.message?.includes('no such table') || tagError.code === '42P01') {
          link.tags = [];
        } else {
          console.error('Erro ao buscar tags do link:', tagError);
          link.tags = [];
        }
      }
    }
    
    return res.json(links);
  } catch (error) {
    console.error('Erro ao buscar links:', error);
    return res.status(500).json({ error: 'Erro ao buscar links' });
  }
});

app.post('/api/useful-links', async (req: Request, res: Response) => {
  try {
    const { title, url, imageUrl, tagIds } = req.body;
    
    if (!title || !url) {
      return res.status(400).json({ error: 'Campos obrigatórios: title, url' });
    }
    
    const id = `link-${Date.now()}`;
    const createdAt = Date.now();
    
    if (useSQLite && db) {
      runTransaction((db) => {
        db.prepare('INSERT INTO useful_links (id, title, url, image_url, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(id, title, url, imageUrl || null, createdAt);
        
        // Associar tags se fornecidas
        if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
          const insertLinkTag = db.prepare('INSERT INTO link_tags (id, link_id, tag_id) VALUES (?, ?, ?)');
          for (const tagId of tagIds) {
            const linkTagId = `link-tag-${Date.now()}-${Math.random()}`;
            insertLinkTag.run(linkTagId, id, tagId);
          }
        }
      });
    } else {
      // PostgreSQL (comentado para desenvolvimento local)
      /*
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          'INSERT INTO useful_links (id, title, url, image_url, created_at) VALUES ($1, $2, $3, $4, $5)',
          [id, title, url, imageUrl || null, createdAt]
        );
        if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
          for (const tagId of tagIds) {
            const linkTagId = `link-tag-${Date.now()}-${Math.random()}`;
            await client.query(
              'INSERT INTO link_tags (id, link_id, tag_id) VALUES ($1, $2, $3)',
              [linkTagId, id, tagId]
            );
          }
        }
        await client.query('COMMIT');
      } finally {
        client.release();
      }
      */
    }
    
    // Buscar tags associadas
    let tags = [];
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      if (useSQLite) {
        // SQLite: usar IN com placeholders
        const placeholders = tagIds.map(() => '?').join(',');
        const tagsResult = await query(
          `SELECT t.id, t.name, t.color, t.created_at 
           FROM tags t 
           WHERE t.id IN (${placeholders}) 
           ORDER BY t.name ASC`,
          tagIds
        );
        tags = convertNumericFieldsInArray(tagsResult.map(t => ({
          id: t.id,
          name: t.name,
          color: t.color || null,
          createdAt: t.created_at
        })), ['createdAt']);
      } else {
        // PostgreSQL (comentado)
        /*
        const tagsResult = await pool.query(
          `SELECT t.id, t.name, t.color, t.created_at 
           FROM tags t 
           WHERE t.id = ANY($1::text[]) 
           ORDER BY t.name ASC`,
          [tagIds]
        );
        tags = tagsResult.rows.map(t => ({
          id: t.id,
          name: t.name,
          color: t.color || null,
          createdAt: parseInt(t.created_at)
        }));
        */
      }
    }
    
    return res.json(convertNumericFields({ id, title, url, imageUrl: imageUrl || null, createdAt, tags }, ['createdAt']));
  } catch (error: any) {
    console.error('Erro ao criar link:', error);
    return res.status(500).json({ error: 'Erro ao criar link', details: error?.message });
  }
});

app.put('/api/useful-links/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, url, imageUrl, tagIds } = req.body;
    
    if (useSQLite && db) {
      runTransaction((db) => {
        // Atualizar link
        const updates: string[] = [];
        const params: any[] = [];
        
        if (title !== undefined) {
          updates.push('title = ?');
          params.push(title);
        }
        if (url !== undefined) {
          updates.push('url = ?');
          params.push(url);
        }
        if (imageUrl !== undefined) {
          updates.push('image_url = ?');
          params.push(imageUrl);
        }
        
        if (updates.length > 0) {
          params.push(id);
          db.prepare(`UPDATE useful_links SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }
        
        // Atualizar tags se fornecidas
        if (tagIds !== undefined) {
          // Remover todas as associações existentes
          db.prepare('DELETE FROM link_tags WHERE link_id = ?').run(id);
          
          // Adicionar novas associações
          if (Array.isArray(tagIds) && tagIds.length > 0) {
            const insertLinkTag = db.prepare('INSERT INTO link_tags (id, link_id, tag_id) VALUES (?, ?, ?)');
            for (const tagId of tagIds) {
              const linkTagId = `link-tag-${Date.now()}-${Math.random()}`;
              insertLinkTag.run(linkTagId, id, tagId);
            }
          }
        }
      });
    } else {
      // PostgreSQL (comentado para desenvolvimento local)
      /*
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          'UPDATE useful_links SET title = COALESCE($1, title), url = COALESCE($2, url), image_url = COALESCE($3, image_url) WHERE id = $4',
          [title, url, imageUrl, id]
        );
        if (tagIds !== undefined) {
          await client.query('DELETE FROM link_tags WHERE link_id = $1', [id]);
          if (Array.isArray(tagIds) && tagIds.length > 0) {
            for (const tagId of tagIds) {
              const linkTagId = `link-tag-${Date.now()}-${Math.random()}`;
              await client.query(
                'INSERT INTO link_tags (id, link_id, tag_id) VALUES ($1, $2, $3)',
                [linkTagId, id, tagId]
              );
            }
          }
        }
        await client.query('COMMIT');
      } finally {
        client.release();
      }
      */
    }
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao atualizar link:', error);
    return res.status(500).json({ error: 'Erro ao atualizar link', details: error?.message });
  }
});

app.delete('/api/useful-links/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Deletar tags associadas primeiro
    await execute(
      useSQLite ? 'DELETE FROM link_tags WHERE link_id = ?' : 'DELETE FROM link_tags WHERE link_id = $1',
      [id]
    );
    await execute(
      useSQLite ? 'DELETE FROM useful_links WHERE id = ?' : 'DELETE FROM useful_links WHERE id = $1',
      [id]
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover link' });
  }
});

// ============ TAGS ============
app.get('/api/tags', async (req: Request, res: Response) => {
  try {
    const tags = await query('SELECT * FROM tags ORDER BY name ASC');
    const converted = convertNumericFieldsInArray(tags.map(t => ({
      id: t.id,
      name: t.name,
      color: t.color || null,
      createdAt: t.created_at
    })), ['createdAt']);
    return res.json(converted);
  } catch (error: any) {
    // Se a tabela não existe, retornar array vazio
    if (error.message?.includes('no such table') || error.code === '42P01') {
      return res.json([]);
    }
    console.error('Erro ao buscar tags:', error);
    return res.status(500).json({ error: 'Erro ao buscar tags' });
  }
});

app.post('/api/tags', async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome da tag é obrigatório' });
    }
    
    // Verificar se já existe tag com o mesmo nome
    const existing = await queryOne(
      useSQLite
        ? 'SELECT id FROM tags WHERE LOWER(name) = LOWER(?)'
        : 'SELECT id FROM tags WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );
    if (existing) {
      return res.status(400).json({ error: 'Já existe uma tag com este nome' });
    }
    
    const id = `tag-${Date.now()}`;
    const createdAt = Date.now();
    await execute(
      useSQLite
        ? 'INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)'
        : 'INSERT INTO tags (id, name, color, created_at) VALUES ($1, $2, $3, $4)',
      [id, name.trim(), color || null, createdAt]
    );
    return res.json(convertNumericFields({ id, name: name.trim(), color: color || null, createdAt }, ['createdAt']));
  } catch (error: any) {
    console.error('Erro ao criar tag:', error);
    return res.status(500).json({ error: 'Erro ao criar tag', details: error?.message });
  }
});

app.put('/api/tags/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    
    if (name && name.trim()) {
      // Verificar se já existe outra tag com o mesmo nome
      const existing = await queryOne(
        useSQLite
          ? 'SELECT id FROM tags WHERE LOWER(name) = LOWER(?) AND id != ?'
          : 'SELECT id FROM tags WHERE LOWER(name) = LOWER($1) AND id != $2',
        [name.trim(), id]
      );
      if (existing) {
        return res.status(400).json({ error: 'Já existe uma tag com este nome' });
      }
    }
    
    // Construir query dinamicamente para SQLite
    const updates: string[] = [];
    const params: any[] = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name ? name.trim() : null);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }
    
    if (updates.length > 0) {
      params.push(id);
      await execute(
        `UPDATE tags SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao atualizar tag:', error);
    return res.status(500).json({ error: 'Erro ao atualizar tag', details: error?.message });
  }
});

app.delete('/api/tags/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Deletar associações primeiro
    await execute(
      useSQLite ? 'DELETE FROM link_tags WHERE tag_id = ?' : 'DELETE FROM link_tags WHERE tag_id = $1',
      [id]
    );
    await execute(
      useSQLite ? 'DELETE FROM tags WHERE id = ?' : 'DELETE FROM tags WHERE id = $1',
      [id]
    );
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao remover tag:', error);
    return res.status(500).json({ error: 'Erro ao remover tag', details: error?.message });
  }
});

// ============ DESIGNER NOTIFICATIONS ============
app.get('/api/designer-notifications', async (req: Request, res: Response) => {
  try {
    // SQLite e PostgreSQL usam a mesma sintaxe para LEFT JOIN
    const result = await query(
      'SELECT dn.*, u.name as designer_name FROM designer_notifications dn LEFT JOIN users u ON dn.designer_id = u.id ORDER BY dn.created_at DESC',
      []
    );
    
    return res.json(result.map(row => {
      // Converter created_at e updated_at para número
      let createdAt = row.created_at;
      let updatedAt = row.updated_at;
      
      if (createdAt instanceof Date) {
        createdAt = createdAt.getTime();
      } else if (typeof createdAt === 'string') {
        const parsed = new Date(createdAt).getTime();
        createdAt = isNaN(parsed) ? Date.now() : parsed;
      } else if (typeof createdAt !== 'number') {
        createdAt = Date.now();
      }
      
      if (updatedAt instanceof Date) {
        updatedAt = updatedAt.getTime();
      } else if (typeof updatedAt === 'string') {
        const parsed = new Date(updatedAt).getTime();
        updatedAt = isNaN(parsed) ? Date.now() : parsed;
      } else if (typeof updatedAt !== 'number') {
        updatedAt = Date.now();
      }
      
      // Converter enabled para boolean (SQLite retorna 0/1)
      const enabled = row.enabled === 1 || row.enabled === '1' || row.enabled === true;
      
      return {
        id: String(row.id),
        designerId: String(row.designer_id),
        designerName: row.designer_name || null,
        type: row.type,
        h1: row.h1 || null,
        h2: row.h2 || null,
        h3: row.h3 || null,
        enabled: enabled,
        createdAt: Number(createdAt),
        updatedAt: Number(updatedAt)
      };
    }));
  } catch (error: any) {
    // Se a tabela não existe, retornar array vazio
    if (error.message?.includes('no such table') || error.code === '42P01') {
      return res.json([]);
    }
    console.error('Erro ao buscar notificações:', error);
    return res.status(500).json({ error: 'Erro ao buscar notificações', details: error?.message });
  }
});

app.get('/api/designer-notifications/designer/:designerId', async (req: Request, res: Response) => {
  try {
    const { designerId } = req.params;
    const result = await query(
      useSQLite
        ? 'SELECT * FROM designer_notifications WHERE designer_id = ? AND enabled = 1 ORDER BY created_at DESC LIMIT 1'
        : 'SELECT * FROM designer_notifications WHERE designer_id = $1 AND enabled = true ORDER BY created_at DESC LIMIT 1',
      [designerId]
    );
    if (result.length === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }
    const row = result[0];
    return res.json(convertNumericFields({
      id: row.id,
      designerId: row.designer_id,
      type: row.type,
      h1: row.h1,
      h2: row.h2,
      h3: row.h3,
      enabled: row.enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }, ['createdAt', 'updatedAt']));
  } catch (error) {
    console.error('Erro ao buscar notificação do designer:', error);
    return res.status(500).json({ error: 'Erro ao buscar notificação' });
  }
});

app.post('/api/designer-notifications', async (req: Request, res: Response) => {
  try {
    const { designerId, type, h1, h2, h3, enabled } = req.body;
    
    console.log('📝 Recebendo requisição para criar notificação:', { designerId, type, h1, h2, h3, enabled });
    
    // Validações
    if (!designerId) {
      console.error('❌ designerId não fornecido');
      return res.status(400).json({ error: 'designerId é obrigatório' });
    }
    if (!type) {
      console.error('❌ type não fornecido');
      return res.status(400).json({ error: 'type é obrigatório' });
    }
    if (!['common', 'important', 'urgent'].includes(type)) {
      console.error('❌ type inválido:', type);
      return res.status(400).json({ error: 'type deve ser: common, important ou urgent' });
    }
    
    // Verificar se o designer existe
    const designerCheck = await queryOne(
      useSQLite ? 'SELECT id FROM users WHERE id = ?' : 'SELECT id FROM users WHERE id = $1',
      [designerId]
    );
    if (!designerCheck) {
      console.error('❌ Designer não encontrado:', designerId);
      return res.status(404).json({ error: 'Designer não encontrado' });
    }
    console.log('✅ Designer encontrado:', designerCheck.id);
    
    // Verificar se pelo menos um campo de conteúdo está preenchido
    if (!h1?.trim() && !h2?.trim() && !h3?.trim()) {
      console.error('❌ Nenhum campo de conteúdo preenchido');
      return res.status(400).json({ error: 'Preencha pelo menos um campo (H1, H2 ou H3)' });
    }
    
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    console.log('💾 Inserindo notificação no banco...');
    console.log('📋 Valores:', { id, designerId, type, h1: h1?.trim() || null, h2: h2?.trim() || null, h3: h3?.trim() || null, enabled: enabled !== false, now });
    
    try {
      if (useSQLite && db) {
        // SQLite: usar número diretamente para created_at e updated_at
        db.prepare(
          'INSERT INTO designer_notifications (id, designer_id, type, h1, h2, h3, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
          id, designerId, type, h1?.trim() || null, h2?.trim() || null, h3?.trim() || null, enabled !== false ? 1 : 0, now, now
        );
      } else {
        // PostgreSQL (comentado para desenvolvimento local)
        /*
        const tableInfo = await pool.query(`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = 'designer_notifications' 
          AND column_name = 'created_at'
        `);
        
        const isTimestamp = tableInfo.rows.length > 0 && 
                           (tableInfo.rows[0].data_type === 'timestamp without time zone' || 
                            tableInfo.rows[0].data_type === 'timestamp with time zone');
        
        let createdAtValue, updatedAtValue;
        
        if (isTimestamp) {
          createdAtValue = new Date(now);
          updatedAtValue = new Date(now);
        } else {
          createdAtValue = now;
          updatedAtValue = now;
        }
        
        const enabledColumnInfo = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'designer_notifications' 
          AND (column_name = 'enabled' OR column_name = 'active')
          LIMIT 1
        `);
        
        const enabledColumnName = enabledColumnInfo.rows.length > 0 
          ? enabledColumnInfo.rows[0].column_name 
          : 'enabled';
        
        const columnName = enabledColumnName === 'active' ? 'active' : 'enabled';
        await pool.query(
          `INSERT INTO designer_notifications (id, designer_id, type, h1, h2, h3, ${columnName}, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [id, designerId, type, h1?.trim() || null, h2?.trim() || null, h3?.trim() || null, enabled !== false, createdAtValue, updatedAtValue]
        );
        */
        throw new Error('PostgreSQL não disponível em desenvolvimento local');
      }
    } catch (insertError: any) {
      console.error('❌ Erro ao inserir no banco:', insertError);
      console.error('❌ Código do erro:', insertError?.code);
      console.error('❌ Mensagem:', insertError?.message);
      throw insertError;
    }
    console.log('✅ Notificação inserida com sucesso, ID:', id);
    
    const row = await queryOne(
      useSQLite ? 'SELECT * FROM designer_notifications WHERE id = ?' : 'SELECT * FROM designer_notifications WHERE id = $1',
      [id]
    );
    if (!row) {
      console.error('❌ Notificação criada mas não encontrada após inserção');
      return res.status(500).json({ error: 'Notificação criada mas não foi possível recuperá-la' });
    }
    
    const notificationEnabled = row.enabled !== undefined ? (row.enabled === 1 || row.enabled === '1' || row.enabled === true) : (row.active !== undefined ? (row.active === 1 || row.active === '1' || row.active === true) : true);
    
    console.log('✅ Notificação criada com sucesso:', row.id);
    return res.json(convertNumericFields({
      id: String(row.id),
      designerId: String(row.designer_id),
      type: row.type,
      h1: row.h1,
      h2: row.h2,
      h3: row.h3,
      enabled: notificationEnabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }, ['createdAt', 'updatedAt']));
  } catch (error: any) {
    console.error('Erro ao criar notificação:', error);
    
    // Verificar se é erro de tabela não encontrada
    if (error?.code === '42P01' || error?.message?.includes('does not exist') || error?.message?.includes('no such table')) {
      return res.status(500).json({ 
        error: 'Tabela designer_notifications não encontrada. Execute o script SQL create_designer_notifications_table.sql no banco de dados.',
        details: error?.message 
      });
    }
    
    // Verificar se é erro de foreign key
    if (error?.code === '23503' || error?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(400).json({ 
        error: 'Designer não encontrado ou inválido',
        details: error?.message 
      });
    }
    
    // Verificar se é erro de constraint
    if (error?.code === '23514' || error?.code === 'SQLITE_CONSTRAINT_CHECK') {
      return res.status(400).json({ 
        error: 'Tipo de notificação inválido. Use: common, important ou urgent',
        details: error?.message 
      });
    }
    
    return res.status(500).json({ 
      error: 'Erro ao criar notificação', 
      details: error?.message || error?.toString() 
    });
  }
});

app.put('/api/designer-notifications/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, h1, h2, h3, enabled } = req.body;
    const now = Date.now();
    await execute(
      useSQLite
        ? 'UPDATE designer_notifications SET type = ?, h1 = ?, h2 = ?, h3 = ?, enabled = ?, updated_at = ? WHERE id = ?'
        : 'UPDATE designer_notifications SET type = $1, h1 = $2, h2 = $3, h3 = $4, enabled = $5, updated_at = $6 WHERE id = $7',
      [type, h1 || null, h2 || null, h3 || null, enabled !== false ? (useSQLite ? 1 : true) : (useSQLite ? 0 : false), now, id]
    );
    const row = await queryOne(
      useSQLite ? 'SELECT * FROM designer_notifications WHERE id = ?' : 'SELECT * FROM designer_notifications WHERE id = $1',
      [id]
    );
    if (!row) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }
    return res.json(convertNumericFields({
      id: row.id,
      designerId: row.designer_id,
      type: row.type,
      h1: row.h1,
      h2: row.h2,
      h3: row.h3,
      enabled: row.enabled === 1 || row.enabled === '1' || row.enabled === true,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }, ['createdAt', 'updatedAt']));
  } catch (error: any) {
    console.error('Erro ao atualizar notificação:', error);
    return res.status(500).json({ error: 'Erro ao atualizar notificação', details: error?.message });
  }
});

app.patch('/api/designer-notifications/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const now = Date.now();
    await execute(
      useSQLite
        ? 'UPDATE designer_notifications SET enabled = ?, updated_at = ? WHERE id = ?'
        : 'UPDATE designer_notifications SET enabled = $1, updated_at = $2 WHERE id = $3',
      [enabled ? (useSQLite ? 1 : true) : (useSQLite ? 0 : false), now, id]
    );
    const row = await queryOne(
      useSQLite ? 'SELECT * FROM designer_notifications WHERE id = ?' : 'SELECT * FROM designer_notifications WHERE id = $1',
      [id]
    );
    if (!row) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }
    return res.json(convertNumericFields({
      id: row.id,
      designerId: row.designer_id,
      type: row.type,
      h1: row.h1,
      h2: row.h2,
      h3: row.h3,
      enabled: row.enabled === 1 || row.enabled === '1' || row.enabled === true,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }, ['createdAt', 'updatedAt']));
  } catch (error: any) {
    console.error('Erro ao alterar status da notificação:', error);
    return res.status(500).json({ error: 'Erro ao alterar status', details: error?.message });
  }
});

app.delete('/api/designer-notifications/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await execute(
      useSQLite ? 'DELETE FROM designer_notifications WHERE id = ?' : 'DELETE FROM designer_notifications WHERE id = $1',
      [id]
    );
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar notificação:', error);
    return res.status(500).json({ error: 'Erro ao deletar notificação', details: error?.message });
  }
});

// ============ CALENDAR OBSERVATIONS ============
// Criar tabela se não existir (SQLite)
if (useSQLite && db) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS calendar_observations (
        id VARCHAR(50) PRIMARY KEY,
        designer_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date VARCHAR(10) NOT NULL,
        note TEXT NOT NULL,
        type VARCHAR(20) CHECK (type IN ('absence', 'event', 'note')) DEFAULT 'note',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        UNIQUE(designer_id, date)
      );
      CREATE INDEX IF NOT EXISTS idx_calendar_observations_date ON calendar_observations(date);
      CREATE INDEX IF NOT EXISTS idx_calendar_observations_designer ON calendar_observations(designer_id);
    `);
    console.log('✅ Tabela calendar_observations criada/verificada');
  } catch (error: any) {
    console.error('⚠️  Erro ao criar tabela calendar_observations:', error.message);
  }
}

// GET /api/calendar-observations - Listar todas as observações
app.get('/api/calendar-observations', async (req: Request, res: Response) => {
  try {
    const { date, designerId } = req.query;
    
    let sql = `
      SELECT 
        co.id,
        co.designer_id,
        u.name as designer_name,
        co.date,
        co.note,
        co.type,
        co.created_at,
        co.updated_at
      FROM calendar_observations co
      LEFT JOIN users u ON co.designer_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (date) {
      sql += useSQLite ? ' AND co.date = ?' : ' AND co.date = $' + (params.length + 1);
      params.push(date);
    }
    
    if (designerId) {
      sql += useSQLite ? ' AND co.designer_id = ?' : ' AND co.designer_id = $' + (params.length + 1);
      params.push(designerId);
    }
    
    sql += ' ORDER BY co.date DESC, co.created_at DESC';
    
    const rows = await query(sql, params);
    
    return res.json(rows.map((row: any) => convertNumericFields({
      id: String(row.id),
      designerId: String(row.designer_id),
      designerName: row.designer_name,
      date: row.date,
      note: row.note,
      type: row.type || 'note',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }, ['createdAt', 'updatedAt'])));
  } catch (error: any) {
    console.error('Erro ao buscar observações:', error);
    return res.status(500).json({ error: 'Erro ao buscar observações', details: error?.message });
  }
});

// GET /api/calendar-observations/:id - Buscar uma observação específica
app.get('/api/calendar-observations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const row = await queryOne(
      useSQLite
        ? `SELECT co.*, u.name as designer_name 
           FROM calendar_observations co 
           LEFT JOIN users u ON co.designer_id = u.id 
           WHERE co.id = ?`
        : `SELECT co.*, u.name as designer_name 
           FROM calendar_observations co 
           LEFT JOIN users u ON co.designer_id = u.id 
           WHERE co.id = $1`,
      [id]
    );
    
    if (!row) {
      return res.status(404).json({ error: 'Observação não encontrada' });
    }
    
    return res.json(convertNumericFields({
      id: String(row.id),
      designerId: String(row.designer_id),
      designerName: row.designer_name,
      date: row.date,
      note: row.note,
      type: row.type || 'note',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }, ['createdAt', 'updatedAt']));
  } catch (error: any) {
    console.error('Erro ao buscar observação:', error);
    return res.status(500).json({ error: 'Erro ao buscar observação', details: error?.message });
  }
});

// POST /api/calendar-observations - Criar nova observação
app.post('/api/calendar-observations', async (req: Request, res: Response) => {
  try {
    const { designerId, date, note, type } = req.body;
    
    if (!designerId || !date || !note) {
      return res.status(400).json({ error: 'designerId, date e note são obrigatórios' });
    }
    
    // Validar formato de data (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Formato de data inválido. Use YYYY-MM-DD' });
    }
    
    // Validar tipo
    const validType = type && ['absence', 'event', 'note'].includes(type) ? type : 'note';
    
    const id = `obs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    // Verificar se já existe observação para este designer e data
    const existing = await queryOne(
      useSQLite
        ? 'SELECT id FROM calendar_observations WHERE designer_id = ? AND date = ?'
        : 'SELECT id FROM calendar_observations WHERE designer_id = $1 AND date = $2',
      [designerId, date]
    );
    
    if (existing) {
      return res.status(400).json({ error: 'Já existe uma observação para este designer nesta data' });
    }
    
    await execute(
      useSQLite
        ? 'INSERT INTO calendar_observations (id, designer_id, date, note, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        : 'INSERT INTO calendar_observations (id, designer_id, date, note, type, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, designerId, date, note, validType, now, now]
    );
    
    // Buscar designer name
    const designer = await queryOne(
      useSQLite ? 'SELECT name FROM users WHERE id = ?' : 'SELECT name FROM users WHERE id = $1',
      [designerId]
    );
    
    return res.json(convertNumericFields({
      id,
      designerId,
      designerName: designer?.name,
      date,
      note,
      type: validType,
      createdAt: now,
      updatedAt: now
    }, ['createdAt', 'updatedAt']));
  } catch (error: any) {
    console.error('Erro ao criar observação:', error);
    
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE' || error?.code === '23505') {
      return res.status(400).json({ error: 'Já existe uma observação para este designer nesta data' });
    }
    
    return res.status(500).json({ error: 'Erro ao criar observação', details: error?.message });
  }
});

// PUT /api/calendar-observations/:id - Atualizar observação
app.put('/api/calendar-observations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { note, type, date, designerId } = req.body;
    
    // Verificar se a observação existe
    const existing = await queryOne(
      useSQLite ? 'SELECT * FROM calendar_observations WHERE id = ?' : 'SELECT * FROM calendar_observations WHERE id = $1',
      [id]
    );
    
    if (!existing) {
      return res.status(404).json({ error: 'Observação não encontrada' });
    }
    
    // Construir query de atualização dinamicamente
    const updates: string[] = [];
    const params: any[] = [];
    
    if (note !== undefined) {
      updates.push(useSQLite ? 'note = ?' : `note = $${params.length + 1}`);
      params.push(note);
    }
    
    if (type !== undefined) {
      const validType = ['absence', 'event', 'note'].includes(type) ? type : 'note';
      updates.push(useSQLite ? 'type = ?' : `type = $${params.length + 1}`);
      params.push(validType);
    }
    
    if (date !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Formato de data inválido. Use YYYY-MM-DD' });
      }
      updates.push(useSQLite ? 'date = ?' : `date = $${params.length + 1}`);
      params.push(date);
    }
    
    if (designerId !== undefined) {
      updates.push(useSQLite ? 'designer_id = ?' : `designer_id = $${params.length + 1}`);
      params.push(designerId);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    updates.push(useSQLite ? 'updated_at = ?' : `updated_at = $${params.length + 1}`);
    params.push(Date.now());
    
    params.push(id);
    
    await execute(
      useSQLite
        ? `UPDATE calendar_observations SET ${updates.join(', ')} WHERE id = ?`
        : `UPDATE calendar_observations SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params
    );
    
    // Buscar observação atualizada
    const updated = await queryOne(
      useSQLite
        ? `SELECT co.*, u.name as designer_name 
           FROM calendar_observations co 
           LEFT JOIN users u ON co.designer_id = u.id 
           WHERE co.id = ?`
        : `SELECT co.*, u.name as designer_name 
           FROM calendar_observations co 
           LEFT JOIN users u ON co.designer_id = u.id 
           WHERE co.id = $1`,
      [id]
    );
    
    return res.json(convertNumericFields({
      id: String(updated.id),
      designerId: String(updated.designer_id),
      designerName: updated.designer_name,
      date: updated.date,
      note: updated.note,
      type: updated.type || 'note',
      createdAt: updated.created_at,
      updatedAt: updated.updated_at
    }, ['createdAt', 'updatedAt']));
  } catch (error: any) {
    console.error('Erro ao atualizar observação:', error);
    return res.status(500).json({ error: 'Erro ao atualizar observação', details: error?.message });
  }
});

// DELETE /api/calendar-observations/:id - Deletar observação
app.delete('/api/calendar-observations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await execute(
      useSQLite ? 'DELETE FROM calendar_observations WHERE id = ?' : 'DELETE FROM calendar_observations WHERE id = $1',
      [id]
    );
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar observação:', error);
    return res.status(500).json({ error: 'Erro ao deletar observação', details: error?.message });
  }
});

// ============ HEALTH CHECK ============
app.get('/api/health', (req: Request, res: Response) => {
  return res.json({ status: 'ok', timestamp: Date.now() });
});

// ============ EXPORT ============
export default app;
