import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Carregar variáveis de ambiente (ESModules)
import dotenv from 'dotenv';
dotenv.config();

// Verificar se DATABASE_URL está configurada
if (!process.env.DATABASE_URL) {
  console.error('❌ ERRO: DATABASE_URL não está definida no arquivo .env');
  process.exit(1);
}

// Verificar se não está tentando conectar em localhost (exceto em desenvolvimento local)
if (process.env.DATABASE_URL.includes('localhost') && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  AVISO: Tentando conectar em localhost em produção!');
}

const isProduction = process.env.DATABASE_URL?.includes('neon') || 
                     process.env.DATABASE_URL?.includes('vercel') ||
                     process.env.VERCEL === '1';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Configuração do pool de conexão
const pool = new Pool({
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
    const result = await pool.query(
      'SELECT id, name, password, role, avatar_url, avatar_color, active FROM users WHERE name = $1 AND active = true',
      [name]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    const user = result.rows[0];
    
    // Em desenvolvimento, permite login do admin com senha plain-text '123456'
    const devAdminBypass = isDevelopment && user.role === 'ADM' && password === '123456';
    const isValidPassword = devAdminBypass || await comparePassword(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }
    return res.json({
      id: user.id,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatar_url,
      avatarColor: user.avatar_color,
      active: user.active
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
    
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const isValidPassword = await comparePassword(oldPassword, result.rows[0].password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }
    
    const hashedNewPassword = await hashPassword(newPassword);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, userId]);
    
    return res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

// ============ USERS ============
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, name, role, avatar_url, avatar_color, active FROM users ORDER BY name');
    return res.json(result.rows.map(u => ({
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
    const result = await pool.query(
      "SELECT id, name, role, avatar_url, avatar_color, active FROM users WHERE role = 'DESIGNER' ORDER BY name"
    );
    return res.json(result.rows.map(u => ({
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
    await pool.query(
      'INSERT INTO users (id, name, password, role, avatar_color, active) VALUES ($1, $2, $3, $4, $5, true)',
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
    const hashedPassword = password ? await hashPassword(password) : null;
    await pool.query(
      'UPDATE users SET name = COALESCE($1, name), password = COALESCE($2, password), active = COALESCE($3, active), avatar_color = COALESCE($4, avatar_color) WHERE id = $5',
      [name, hashedPassword, active, avatarColor, id]
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

app.delete('/api/users/:id', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    
    // CASCADE DELETE: Remove todos os registros vinculados ao usuário
    // 1. Remover demand_items (via demands do usuário)
    await client.query(`
      DELETE FROM demand_items 
      WHERE demand_id IN (SELECT id FROM demands WHERE user_id = $1)
    `, [id]);
    
    // 2. Remover demands do usuário
    await client.query('DELETE FROM demands WHERE user_id = $1', [id]);
    
    // 3. Remover work_sessions do usuário
    await client.query('DELETE FROM work_sessions WHERE user_id = $1', [id]);
    
    // 4. Remover feedbacks onde o usuário é o designer
    await client.query('DELETE FROM feedbacks WHERE designer_id = $1', [id]);
    
    // 5. Remover lesson_progress do usuário
    await client.query('DELETE FROM lesson_progress WHERE designer_id = $1', [id]);
    
    // 6. Finalmente, deletar o próprio usuário
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    
    return res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Erro ao remover usuário' });
  } finally {
    client.release();
  }
});

// ============ ART TYPES ============
app.get('/api/art-types', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM art_types ORDER BY sort_order');
    return res.json(result.rows.map(a => ({
      id: a.id,
      label: a.label,
      points: a.points,
      order: a.sort_order
    })));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar tipos de arte' });
  }
});

app.post('/api/art-types', async (req: Request, res: Response) => {
  try {
    const { label, points } = req.body;
    const id = `art-${Date.now()}`;
    const maxOrder = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM art_types');
    const order = maxOrder.rows[0].next;
    await pool.query(
      'INSERT INTO art_types (id, label, points, sort_order) VALUES ($1, $2, $3, $4)',
      [id, label, points, order]
    );
    return res.json({ id, label, points, order });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar tipo de arte' });
  }
});

app.put('/api/art-types/reorder', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { artTypes } = req.body;
    await client.query('BEGIN');
    for (const art of artTypes) {
      await client.query('UPDATE art_types SET sort_order = $1 WHERE id = $2', [art.order, art.id]);
    }
    await client.query('COMMIT');
    return res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Erro ao reordenar' });
  } finally {
    client.release();
  }
});

app.put('/api/art-types/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, points, order } = req.body;
    await pool.query(
      'UPDATE art_types SET label = COALESCE($1, label), points = COALESCE($2, points), sort_order = COALESCE($3, sort_order) WHERE id = $4',
      [label, points, order, id]
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar tipo de arte' });
  }
});

app.delete('/api/art-types/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM art_types WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover tipo de arte' });
  }
});

// ============ WORK SESSIONS ============
app.get('/api/work-sessions', async (req: Request, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.query;
    let query = 'SELECT * FROM work_sessions WHERE 1=1';
    const params: any[] = [];
    if (userId) {
      params.push(userId);
      query += ` AND user_id = $${params.length}`;
    }
    if (startDate) {
      params.push(parseInt(startDate as string));
      query += ` AND timestamp >= $${params.length}`;
    }
    if (endDate) {
      params.push(parseInt(endDate as string));
      query += ` AND timestamp <= $${params.length}`;
    }
    query += ' ORDER BY timestamp DESC';
    const result = await pool.query(query, params);
    return res.json(result.rows.map(s => ({
      id: s.id,
      userId: s.user_id,
      timestamp: parseInt(s.timestamp)
    })));
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
    const existing = await pool.query(
      'SELECT * FROM work_sessions WHERE user_id = $1 AND timestamp >= $2 ORDER BY timestamp ASC LIMIT 1',
      [userId, todayStart]
    );
    if (existing.rows.length > 0) {
      const s = existing.rows[0];
      return res.json({ id: s.id, userId: s.user_id, timestamp: parseInt(s.timestamp) });
    }
    
    // Só criar sessão se for após 6h
    await pool.query(
      'INSERT INTO work_sessions (id, user_id, timestamp) VALUES ($1, $2, $3)',
      [id, userId, timestamp]
    );
    return res.json({ id, userId, timestamp });
  } catch (error) {
    console.error('Error creating work session:', error);
    return res.status(500).json({ error: 'Erro ao criar sessão' });
  }
});

// ============ DEMANDS ============

// Função para gerar código de execução baseado no dia da semana e ordem
// Contagem: POR DESIGNER (cada designer tem sua própria sequência)
// Horário: 00:00-23:59 (dia calendário)
async function generateExecutionCode(pool: Pool, timestamp: number, userId: string, excludeDemandId?: string): Promise<string> {
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
  let countQuery = 'SELECT COUNT(*) as count FROM demands WHERE timestamp >= $1 AND timestamp <= $2 AND timestamp < $3 AND user_id = $4';
  const countParams: any[] = [startTs, endTimestamp, currentTs, userId];
  
  if (excludeDemandId) {
    countQuery += ' AND id != $5';
    countParams.push(excludeDemandId);
  }
  
  // Debug: verificar o que está sendo contado
  const debugQuery = countQuery.replace('COUNT(*) as count', 'id, timestamp, execution_code, user_id');
  try {
    const debugResult = await pool.query(debugQuery, countParams);
    console.log('[EXECUTION CODE] Debug - Demandas do DESIGNER no DIA ATUAL:', debugResult.rows.length, {
      userId,
      dia: date.toLocaleDateString('pt-BR'),
      startTimestamp: startTs,
      endTimestamp: endTimestamp,
      currentTimestamp: currentTs,
      dateStart: new Date(startTs).toISOString(),
      dateEnd: new Date(endTimestamp).toISOString(),
      dateCurrent: new Date(currentTs).toISOString(),
      demands: debugResult.rows.map((r: any) => ({
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
  
  const countResult = await pool.query(countQuery, countParams);
  const totalDemandsBeforeThis = parseInt(countResult.rows[0]?.count || '0', 10) || 0;
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
async function reorderExecutionCodes(pool: Pool, deletedTimestamp: number, userId: string) {
  const date = new Date(deletedTimestamp);
  
  // Calcular início e fim do dia (garantir apenas do dia específico)
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  
  const startTimestamp = startOfDay.getTime();
  const endTimestamp = endOfDay.getTime();
  
  // Buscar todas as demandas do DESIGNER no dia ordenadas por timestamp (ordem de criação)
  // IMPORTANTE: Apenas do dia específico E apenas do designer específico
  const demandsResult = await pool.query(
    'SELECT id, timestamp FROM demands WHERE timestamp >= $1 AND timestamp <= $2 AND user_id = $3 ORDER BY timestamp ASC',
    [startTimestamp, endTimestamp, userId]
  );
  
  console.log('[REORDER] Reordenando códigos para', demandsResult.rows.length, 'demandas do designer', userId, 'no dia', date.toLocaleDateString('pt-BR'));
  
  // Reordenar códigos baseado na ordem de timestamp
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Reordenar códigos baseado na ordem de timestamp (ordem de criação)
    for (let i = 0; i < demandsResult.rows.length; i++) {
      const demand = demandsResult.rows[i];
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
      
      await client.query(
        'UPDATE demands SET execution_code = $1 WHERE id = $2',
        [correctCode, demand.id]
      );
    }
    
    await client.query('COMMIT');
    console.log('[EXECUTION CODE] Códigos reordenados para', demandsResult.rows.length, 'demandas do designer', userId);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[EXECUTION CODE] Erro ao reordenar códigos:', error);
    throw error;
  } finally {
    client.release();
  }
}

app.get('/api/demands', async (req: Request, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.query;
    let query = 'SELECT * FROM demands WHERE 1=1';
    const params: any[] = [];
    if (userId) {
      params.push(userId);
      query += ` AND user_id = $${params.length}`;
    }
    if (startDate) {
      params.push(parseInt(startDate as string));
      query += ` AND timestamp >= $${params.length}`;
    }
    if (endDate) {
      params.push(parseInt(endDate as string));
      query += ` AND timestamp <= $${params.length}`;
    }
    query += ' ORDER BY timestamp DESC';
    const result = await pool.query(query, params);
    const demands = await Promise.all(result.rows.map(async (d) => {
      const itemsResult = await pool.query('SELECT * FROM demand_items WHERE demand_id = $1', [d.id]);
      return {
        id: d.id,
        userId: d.user_id,
        userName: d.user_name,
        items: itemsResult.rows.map(i => ({
          artTypeId: i.art_type_id,
          artTypeLabel: i.art_type_label,
          pointsPerUnit: i.points_per_unit,
          quantity: i.quantity,
          variationQuantity: i.variation_quantity,
          variationPoints: i.variation_points,
          totalPoints: i.total_points
        })),
        totalQuantity: d.total_quantity,
        totalPoints: d.total_points,
        timestamp: parseInt(d.timestamp),
        executionCode: d.execution_code || undefined
      };
    }));
    return res.json(demands);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar demandas' });
  }
});

app.post('/api/demands', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { userId, userName, items, totalQuantity, totalPoints } = req.body;
    const id = `demand-${Date.now()}`;
    const timestamp = Date.now();
    
    // Gerar código de execução ANTES de iniciar a transação
    // IMPORTANTE: Passar userId para contar apenas demandas deste designer
    let executionCode: string | null = null;
    try {
      executionCode = await generateExecutionCode(pool, timestamp, userId);
    } catch (codeError: any) {
      console.warn('[CREATE DEMAND] Erro ao gerar código de execução:', codeError?.message);
      // Continuar sem código se houver erro
    }
    
    await client.query('BEGIN');
    
    // Inserir demanda com código de execução (se existir)
    try {
      if (executionCode) {
        await client.query(
          'INSERT INTO demands (id, user_id, user_name, total_quantity, total_points, timestamp, execution_code) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [id, userId, userName, totalQuantity, totalPoints, timestamp, executionCode]
        );
      } else {
        // Se não conseguiu gerar código, inserir sem ele
        await client.query(
          'INSERT INTO demands (id, user_id, user_name, total_quantity, total_points, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, userId, userName, totalQuantity, totalPoints, timestamp]
        );
      }
    } catch (insertError: any) {
      // Se a coluna execution_code não existir, inserir sem ela
      if (insertError?.code === '42703' || insertError?.message?.includes('column "execution_code" does not exist')) {
        console.warn('[CREATE DEMAND] Coluna execution_code não existe, inserindo sem código');
        await client.query(
          'INSERT INTO demands (id, user_id, user_name, total_quantity, total_points, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, userId, userName, totalQuantity, totalPoints, timestamp]
        );
        executionCode = null;
      } else {
        throw insertError;
      }
    }
    
    for (const item of items) {
      await client.query(
        'INSERT INTO demand_items (demand_id, art_type_id, art_type_label, points_per_unit, quantity, variation_quantity, variation_points, total_points) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, item.artTypeId, item.artTypeLabel, item.pointsPerUnit, item.quantity, item.variationQuantity || 0, item.variationPoints || 0, item.totalPoints]
      );
    }
    await client.query('COMMIT');
    
    const response: any = { id, userId, userName, items, totalQuantity, totalPoints, timestamp };
    if (executionCode) {
      response.executionCode = executionCode;
    }
    
    return res.json(response);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[CREATE DEMAND] Erro:', error);
    return res.status(500).json({ error: 'Erro ao criar demanda' });
  } finally {
    client.release();
  }
});

app.put('/api/demands/:id', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { items, totalQuantity, totalPoints } = req.body;
    
    // Buscar demanda atual para obter timestamp e userId
    const currentDemand = await pool.query('SELECT timestamp, user_id FROM demands WHERE id = $1', [id]);
    if (currentDemand.rows.length === 0) {
      return res.status(404).json({ error: 'Demanda não encontrada' });
    }
    
    const timestamp = parseInt(currentDemand.rows[0].timestamp);
    const demandUserId = currentDemand.rows[0].user_id;
    
    // Recalcular código de execução (código muda ao editar)
    // IMPORTANTE: Passar userId para contar apenas demandas deste designer
    let executionCode: string | null = null;
    try {
      executionCode = await generateExecutionCode(pool, timestamp, demandUserId, id);
    } catch (codeError: any) {
      console.warn('[UPDATE DEMAND] Erro ao recalcular código de execução:', codeError?.message);
    }
    
    await client.query('BEGIN');
    
    // Atualizar dados da demanda (incluindo código se existir)
    if (executionCode) {
      try {
        await client.query(
          'UPDATE demands SET total_quantity = $1, total_points = $2, execution_code = $3 WHERE id = $4',
          [totalQuantity, totalPoints, executionCode, id]
        );
      } catch (updateError: any) {
        // Se coluna não existir, atualizar sem código
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
    
    // Remover itens antigos
    await client.query('DELETE FROM demand_items WHERE demand_id = $1', [id]);
    
    // Inserir novos itens
    for (const item of items) {
      await client.query(
        'INSERT INTO demand_items (demand_id, art_type_id, art_type_label, points_per_unit, quantity, variation_quantity, variation_points, total_points) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, item.artTypeId, item.artTypeLabel, item.pointsPerUnit, item.quantity, item.variationQuantity || 0, item.variationPoints || 0, item.totalPoints]
      );
    }
    
    await client.query('COMMIT');
    
    // Buscar demanda atualizada
    const demandResult = await pool.query('SELECT * FROM demands WHERE id = $1', [id]);
    if (demandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Demanda não encontrada' });
    }
    
    const demand = demandResult.rows[0];
    const itemsResult = await pool.query('SELECT * FROM demand_items WHERE demand_id = $1', [id]);
    
    return res.json({
      id: demand.id,
      userId: demand.user_id,
      userName: demand.user_name,
      items: itemsResult.rows.map(i => ({
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
      timestamp: parseInt(demand.timestamp),
      executionCode: demand.execution_code || undefined
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar demanda' });
  } finally {
    client.release();
  }
});

app.delete('/api/demands/:id', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    // Buscar timestamp e userId da demanda antes de deletar (para reordenar códigos)
    const demandResult = await pool.query('SELECT timestamp, user_id FROM demands WHERE id = $1', [id]);
    const deletedTimestamp = demandResult.rows.length > 0 ? parseInt(demandResult.rows[0].timestamp) : null;
    const deletedUserId = demandResult.rows.length > 0 ? demandResult.rows[0].user_id : null;
    
    await client.query('BEGIN');
    await client.query('DELETE FROM demand_items WHERE demand_id = $1', [id]);
    await client.query('DELETE FROM demands WHERE id = $1', [id]);
    await client.query('COMMIT');
    
    // Reordenar códigos após exclusão (se timestamp e userId existem)
    // IMPORTANTE: Reordenar apenas as demandas do designer específico
    if (deletedTimestamp && deletedUserId) {
      try {
        await reorderExecutionCodes(pool, deletedTimestamp, deletedUserId);
      } catch (reorderError) {
        console.error('[DELETE DEMAND] Erro ao reordenar códigos:', reorderError);
        // Não falhar a exclusão se a reordenação falhar
      }
    }
    
    return res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DELETE DEMAND] Erro:', error);
    return res.status(500).json({ error: 'Erro ao remover demanda' });
  } finally {
    client.release();
  }
});

// ============ FEEDBACKS ============
app.get('/api/feedbacks', async (req: Request, res: Response) => {
  try {
    const { designerId } = req.query;
    let query = 'SELECT * FROM feedbacks';
    const params: any[] = [];
    if (designerId) {
      params.push(designerId);
      query += ` WHERE designer_id = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    return res.json(result.rows.map(f => ({
      id: f.id,
      designerId: f.designer_id,
      designerName: f.designer_name,
      adminName: f.admin_name,
      imageUrls: f.image_urls || [],
      comment: f.comment,
      createdAt: parseInt(f.created_at),
      viewed: f.viewed,
      viewedAt: f.viewed_at ? parseInt(f.viewed_at) : undefined,
      response: f.response || undefined,
      responseAt: f.response_at ? parseInt(f.response_at) : undefined
    })));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar feedbacks' });
  }
});

app.post('/api/feedbacks', async (req: Request, res: Response) => {
  try {
    const { designerId, designerName, adminName, imageUrls, comment } = req.body;
    const id = `feedback-${Date.now()}`;
    const createdAt = Date.now();
    await pool.query(
      'INSERT INTO feedbacks (id, designer_id, designer_name, admin_name, image_urls, comment, created_at, viewed) VALUES ($1, $2, $3, $4, $5, $6, $7, false)',
      [id, designerId, designerName, adminName, imageUrls || [], comment, createdAt]
    );
    return res.json({ id, designerId, designerName, adminName, imageUrls, comment, createdAt, viewed: false });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao criar feedback' });
  }
});

app.put('/api/feedbacks/:id/view', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const viewedAt = Date.now();
    await pool.query(
      'UPDATE feedbacks SET viewed = true, viewed_at = $1 WHERE id = $2',
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
    await pool.query(
      'UPDATE feedbacks SET response = $1, response_at = $2 WHERE id = $3',
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
    await pool.query('DELETE FROM feedbacks WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover feedback' });
  }
});

// ============ LESSONS ============
app.get('/api/lessons', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM lessons ORDER BY order_index');
    return res.json(result.rows.map(l => ({
      id: l.id,
      title: l.title,
      description: l.description,
      videoUrl: l.video_url,
      orderIndex: l.order_index,
      createdAt: parseInt(l.created_at)
    })));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar aulas' });
  }
});

app.post('/api/lessons', async (req: Request, res: Response) => {
  try {
    const { title, description, videoUrl } = req.body;
    const id = `lesson-${Date.now()}`;
    const createdAt = Date.now();
    const maxOrder = await pool.query('SELECT COALESCE(MAX(order_index), -1) + 1 as next FROM lessons');
    const orderIndex = maxOrder.rows[0].next;
    await pool.query(
      'INSERT INTO lessons (id, title, description, video_url, order_index, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, title, description || '', videoUrl, orderIndex, createdAt]
    );
    return res.json({ id, title, description, videoUrl, orderIndex, createdAt });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar aula' });
  }
});

app.put('/api/lessons/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, videoUrl, orderIndex } = req.body;
    await pool.query(
      'UPDATE lessons SET title = COALESCE($1, title), description = COALESCE($2, description), video_url = COALESCE($3, video_url), order_index = COALESCE($4, order_index) WHERE id = $5',
      [title, description, videoUrl, orderIndex, id]
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar aula' });
  }
});

app.delete('/api/lessons/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM lessons WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover aula' });
  }
});

// ============ LESSON PROGRESS ============
app.get('/api/lesson-progress/:designerId', async (req: Request, res: Response) => {
  try {
    const { designerId } = req.params;
    const result = await pool.query('SELECT * FROM lesson_progress WHERE designer_id = $1', [designerId]);
    return res.json(result.rows.map(p => ({
      id: p.id,
      lessonId: p.lesson_id,
      designerId: p.designer_id,
      viewed: p.viewed,
      viewedAt: p.viewed_at ? parseInt(p.viewed_at) : undefined
    })));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar progresso' });
  }
});

app.post('/api/lesson-progress', async (req: Request, res: Response) => {
  try {
    const { lessonId, designerId } = req.body;
    const id = `progress-${Date.now()}`;
    const viewedAt = Date.now();
    await pool.query(
      'INSERT INTO lesson_progress (id, lesson_id, designer_id, viewed, viewed_at) VALUES ($1, $2, $3, true, $4) ON CONFLICT (lesson_id, designer_id) DO UPDATE SET viewed = true, viewed_at = $4',
      [id, lessonId, designerId, viewedAt]
    );
    return res.json({ id, lessonId, designerId, viewed: true, viewedAt });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao salvar progresso' });
  }
});

app.delete('/api/lesson-progress/:lessonId/:designerId', async (req: Request, res: Response) => {
  try {
    const { lessonId, designerId } = req.params;
    await pool.query(
      'DELETE FROM lesson_progress WHERE lesson_id = $1 AND designer_id = $2',
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
    const result = await pool.query('SELECT * FROM system_settings WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json({});
    }
    const s = result.rows[0];
    return res.json({
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
      awardsHasUpdates: s.awards_has_updates === true || s.awards_has_updates === 'true' || s.awards_has_updates === 1
    });
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
      awardsHasUpdates
    } = req.body;

    // Verificar e criar coluna daily_art_goal se não existir
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
    let paramIndex = 1;
    
    if (logoUrl !== undefined) {
      updates.push(`logo_url = $${paramIndex}`);
      values.push(logoUrl);
      paramIndex++;
    }
    if (brandTitle !== undefined) {
      updates.push(`brand_title = $${paramIndex}`);
      values.push(brandTitle);
      paramIndex++;
    }
    if (loginSubtitle !== undefined) {
      updates.push(`login_subtitle = $${paramIndex}`);
      values.push(loginSubtitle);
      paramIndex++;
    }
    if (variationPointsValue !== undefined) {
      updates.push(`variation_points = $${paramIndex}`);
      values.push(variationPointsValue);
      paramIndex++;
    }
    if (dailyArtGoalValue !== undefined) {
      updates.push(`daily_art_goal = $${paramIndex}`);
      values.push(dailyArtGoalValue);
      paramIndex++;
    }
    if (motivationalMessage !== undefined) {
      updates.push(`motivational_message = $${paramIndex}`);
      values.push(motivationalMessage);
      paramIndex++;
    }
    if (motivationalMessageEnabled !== undefined) {
      updates.push(`motivational_message_enabled = $${paramIndex}`);
      values.push(motivationalMessageEnabled);
      paramIndex++;
    }
    if (nextAwardImage !== undefined) {
      updates.push(`next_award_image = $${paramIndex}`);
      values.push(nextAwardImage);
      paramIndex++;
    }
    if (chartEnabled !== undefined) {
      updates.push(`chart_enabled = $${paramIndex}`);
      values.push(chartEnabled);
      paramIndex++;
    }
    if (showAwardsChart !== undefined) {
      updates.push(`show_awards_chart = $${paramIndex}`);
      values.push(showAwardsChart);
      paramIndex++;
    }
    if (awardsHasUpdates !== undefined) {
      updates.push(`awards_has_updates = $${paramIndex}`);
      values.push(awardsHasUpdates);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.json({ success: true, message: 'Nenhuma alteração para salvar' });
    }
    
    const query = `UPDATE system_settings SET ${updates.join(', ')} WHERE id = 1`;
    console.log('Query SQL:', query);
    console.log('Valores:', values);
    
    await pool.query(query, values);
    
    // Verificar o valor salvo
    try {
      const verifyResult = await pool.query('SELECT daily_art_goal, variation_points FROM system_settings WHERE id = 1');
      console.log('Valores salvos no banco:', { 
        daily_art_goal: verifyResult.rows[0]?.daily_art_goal, 
        variation_points: verifyResult.rows[0]?.variation_points 
      });
    } catch (verifyError) {
      console.error('Erro ao verificar valores salvos:', verifyError);
    }
    
    // Se houver alterações relacionadas a premiações, ativar flag (exceto se awardsHasUpdates for explicitamente false)
    if (hasAwardRelatedChanges && awardsHasUpdates !== false) {
      try {
        await pool.query('UPDATE system_settings SET awards_has_updates = true WHERE id = 1');
      } catch (updateError) {
        console.error('Erro ao atualizar flag de atualizações:', updateError);
      }
    }
    
    return res.json({ success: true });
  } catch (error: any) {
    // Se as colunas não existirem, tentar criar
    if (error.code === '42703') {
      try {
        await pool.query(`
          ALTER TABLE system_settings 
          ADD COLUMN IF NOT EXISTS daily_art_goal INTEGER DEFAULT 8,
          ADD COLUMN IF NOT EXISTS motivational_message TEXT,
          ADD COLUMN IF NOT EXISTS motivational_message_enabled BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS next_award_image TEXT,
          ADD COLUMN IF NOT EXISTS chart_enabled BOOLEAN DEFAULT true,
          ADD COLUMN IF NOT EXISTS show_awards_chart BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS awards_has_updates BOOLEAN DEFAULT false
        `);
        // Tentar novamente após criar as colunas
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
          awardsHasUpdates
        } = req.body;
        
        const hasAwardRelatedChangesRetry = 
          motivationalMessage !== undefined ||
          motivationalMessageEnabled !== undefined ||
          nextAwardImage !== undefined ||
          chartEnabled !== undefined ||
          showAwardsChart !== undefined;
        
        await pool.query(
          `UPDATE system_settings SET 
            logo_url = COALESCE($1, logo_url), 
            brand_title = COALESCE($2, brand_title), 
            login_subtitle = COALESCE($3, login_subtitle), 
            variation_points = COALESCE($4, variation_points),
            daily_art_goal = COALESCE($5, daily_art_goal),
            motivational_message = COALESCE($6, motivational_message),
            motivational_message_enabled = COALESCE($7, motivational_message_enabled),
            next_award_image = COALESCE($8, next_award_image),
            chart_enabled = COALESCE($9, chart_enabled),
            show_awards_chart = COALESCE($10, show_awards_chart),
            awards_has_updates = COALESCE($11, awards_has_updates)
          WHERE id = 1`,
          [
            logoUrl, 
            brandTitle, 
            loginSubtitle, 
            variationPoints,
            dailyArtGoal !== undefined && dailyArtGoal !== null ? Number(dailyArtGoal) : null,
            motivationalMessage,
            motivationalMessageEnabled,
            nextAwardImage,
            chartEnabled,
            showAwardsChart,
            awardsHasUpdates
          ]
        );
        
        // Se houver alterações relacionadas a premiações, ativar flag (exceto se awardsHasUpdates for explicitamente false)
        if (hasAwardRelatedChangesRetry && awardsHasUpdates !== false) {
          try {
            await pool.query('UPDATE system_settings SET awards_has_updates = true WHERE id = 1');
          } catch (updateError) {
            console.error('Erro ao atualizar flag de atualizações:', updateError);
          }
        }
        
        return res.json({ success: true });
      } catch (createError) {
        console.error('Erro ao criar colunas:', createError);
        return res.status(500).json({ error: 'Erro ao atualizar configurações', details: createError });
      }
    }
    console.error('Erro ao atualizar configurações:', error);
    return res.status(500).json({ error: 'Erro ao atualizar configurações', details: error.message });
  }
});

// ============ AWARDS ============
app.get('/api/awards', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM awards ORDER BY created_at DESC');
    return res.json(result.rows.map(a => ({
      id: a.id,
      designerId: a.designer_id,
      designerName: a.designer_name,
      month: a.month,
      description: a.description,
      imageUrl: a.image_url,
      createdAt: parseInt(a.created_at)
    })));
  } catch (error: any) {
    console.error('Erro ao buscar premiações:', error);
    // Se a tabela não existe, retornar array vazio em vez de erro
    if (error.code === '42P01') {
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
      const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [designerId]);
      if (userCheck.rows.length === 0) {
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
      const result = await pool.query(
        'INSERT INTO awards (id, designer_id, designer_name, month, description, image_url, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [id, designerId, designerName, month, description || '', imageUrl || null, createdAt]
      );
      
      console.log('Premiação inserida com sucesso:', result.rows[0]);
      
      // Ativar flag de atualizações
      try {
        await pool.query('UPDATE system_settings SET awards_has_updates = true WHERE id = 1');
      } catch (updateError) {
        console.error('Erro ao atualizar flag de atualizações:', updateError);
      }
      
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
    } catch (dbError: any) {
      // Erro específico do banco de dados
      console.error('Erro SQL ao criar premiação:', {
        code: dbError.code,
        message: dbError.message,
        detail: dbError.detail,
        constraint: dbError.constraint
      });
      
      // Verificar se é erro de tabela não encontrada
      if (dbError.code === '42P01') {
        return res.status(500).json({ 
          error: 'Tabela awards não encontrada no banco de dados',
          details: 'Execute o SQL de criação da tabela awards no seu banco de dados Neon. Código do erro: 42P01'
        });
      }
      
      // Verificar se é erro de foreign key
      if (dbError.code === '23503') {
        return res.status(400).json({ 
          error: 'Designer inválido',
          details: `O designer selecionado não existe no banco de dados. Código do erro: 23503. Detalhes: ${dbError.detail || dbError.message}`
        });
      }
      
      // Verificar se é erro de constraint
      if (dbError.code === '23505') {
        return res.status(400).json({ 
          error: 'Premiação duplicada',
          details: `Já existe uma premiação com esses dados. Código do erro: 23505`
        });
      }
      
      return res.status(500).json({ 
        error: 'Erro ao criar premiação no banco de dados',
        details: `Código: ${dbError.code || 'N/A'}, Mensagem: ${dbError.message || 'Erro desconhecido'}, Detalhes: ${dbError.detail || 'N/A'}`
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
    await pool.query('DELETE FROM awards WHERE id = $1', [id]);
    
    // Ativar flag de atualizações
    try {
      await pool.query('UPDATE system_settings SET awards_has_updates = true WHERE id = 1');
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
    await pool.query('UPDATE system_settings SET awards_has_updates = false WHERE id = 1');
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
    const designersResult = await pool.query(
      'SELECT id, name, avatar_color, avatar_url FROM users WHERE role = $1 AND active = true',
      ['DESIGNER']
    );

    // Buscar demandas do mês atual
    const demandsResult = await pool.query(
      'SELECT user_id, total_points FROM demands WHERE timestamp >= $1 AND timestamp <= $2',
      [currentMonthStart, currentMonthEnd]
    );

    // Agrupar pontos por designer
    const pointsByDesigner: Record<string, number> = {};
    demandsResult.rows.forEach((demand: any) => {
      const userId = demand.user_id;
      if (!pointsByDesigner[userId]) {
        pointsByDesigner[userId] = 0;
      }
      pointsByDesigner[userId] += parseInt(demand.total_points) || 0;
    });

    // Montar resposta com dados formatados
    const chartData = designersResult.rows
      .map((designer: any) => {
        const shortName = designer.name.split(' - ')[1] || designer.name.split(' ')[0];
        let color = designer.avatar_color;
        if (!color && designer.avatar_url) {
          const bgMatch = designer.avatar_url.match(/background=([a-fA-F0-9]{6})/);
          if (bgMatch) color = `#${bgMatch[1]}`;
        }
        if (!color) {
          const colors = ['#4F46E5', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];
          const index = designersResult.rows.findIndex((d: any) => d.id === designer.id);
          color = colors[index % colors.length];
        }

        return {
          name: shortName,
          totalPoints: pointsByDesigner[designer.id] || 0,
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
    const result = await pool.query('SELECT * FROM useful_links ORDER BY created_at DESC');
    const links = result.rows.map(l => ({
      id: l.id,
      title: l.title,
      url: l.url,
      imageUrl: l.image_url,
      createdAt: parseInt(l.created_at)
    }));
    
    // Buscar tags para cada link
    for (const link of links) {
      try {
        const tagsResult = await pool.query(
          `SELECT t.id, t.name, t.color, t.created_at 
           FROM tags t 
           INNER JOIN link_tags lt ON t.id = lt.tag_id 
           WHERE lt.link_id = $1 
           ORDER BY t.name ASC`,
          [link.id]
        );
        link.tags = tagsResult.rows.map(t => ({
          id: t.id,
          name: t.name,
          color: t.color || null,
          createdAt: parseInt(t.created_at)
        }));
      } catch (tagError: any) {
        // Se a tabela não existe, retornar array vazio
        if (tagError.code === '42P01') {
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
  const client = await pool.connect();
  try {
    const { title, url, imageUrl, tagIds } = req.body;
    
    if (!title || !url) {
      return res.status(400).json({ error: 'Campos obrigatórios: title, url' });
    }
    
    await client.query('BEGIN');
    
    const id = `link-${Date.now()}`;
    const createdAt = Date.now();
    await client.query(
      'INSERT INTO useful_links (id, title, url, image_url, created_at) VALUES ($1, $2, $3, $4, $5)',
      [id, title, url, imageUrl || null, createdAt]
    );
    
    // Associar tags se fornecidas
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
    
    // Buscar tags associadas
    let tags = [];
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
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
    }
    
    return res.json({ id, title, url, imageUrl: imageUrl || null, createdAt, tags });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar link:', error);
    return res.status(500).json({ error: 'Erro ao criar link', details: error?.message });
  } finally {
    client.release();
  }
});

app.put('/api/useful-links/:id', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { title, url, imageUrl, tagIds } = req.body;
    
    await client.query('BEGIN');
    
    // Atualizar link
    await client.query(
      'UPDATE useful_links SET title = COALESCE($1, title), url = COALESCE($2, url), image_url = COALESCE($3, image_url) WHERE id = $4',
      [title, url, imageUrl, id]
    );
    
    // Atualizar tags se fornecidas
    if (tagIds !== undefined) {
      // Remover todas as associações existentes
      await client.query('DELETE FROM link_tags WHERE link_id = $1', [id]);
      
      // Adicionar novas associações
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
    return res.json({ success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar link:', error);
    return res.status(500).json({ error: 'Erro ao atualizar link', details: error?.message });
  } finally {
    client.release();
  }
});

app.delete('/api/useful-links/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Deletar tags associadas primeiro
    await pool.query('DELETE FROM link_tags WHERE link_id = $1', [id]);
    await pool.query('DELETE FROM useful_links WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover link' });
  }
});

// ============ TAGS ============
app.get('/api/tags', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM tags ORDER BY name ASC');
    return res.json(result.rows.map(t => ({
      id: t.id,
      name: t.name,
      color: t.color || null,
      createdAt: parseInt(t.created_at)
    })));
  } catch (error: any) {
    // Se a tabela não existe, retornar array vazio
    if (error.code === '42P01') {
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
    const existing = await pool.query('SELECT id FROM tags WHERE LOWER(name) = LOWER($1)', [name.trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Já existe uma tag com este nome' });
    }
    
    const id = `tag-${Date.now()}`;
    const createdAt = Date.now();
    await pool.query(
      'INSERT INTO tags (id, name, color, created_at) VALUES ($1, $2, $3, $4)',
      [id, name.trim(), color || null, createdAt]
    );
    return res.json({ id, name: name.trim(), color: color || null, createdAt });
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
      const existing = await pool.query('SELECT id FROM tags WHERE LOWER(name) = LOWER($1) AND id != $2', [name.trim(), id]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Já existe uma tag com este nome' });
      }
    }
    
    await pool.query(
      'UPDATE tags SET name = COALESCE($1, name), color = COALESCE($2, color) WHERE id = $3',
      [name ? name.trim() : null, color, id]
    );
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
    await pool.query('DELETE FROM link_tags WHERE tag_id = $1', [id]);
    await pool.query('DELETE FROM tags WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao remover tag:', error);
    return res.status(500).json({ error: 'Erro ao remover tag', details: error?.message });
  }
});

// ============ DESIGNER NOTIFICATIONS ============
app.get('/api/designer-notifications', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        dn.*,
        u.name as designer_name
      FROM designer_notifications dn
      LEFT JOIN users u ON dn.designer_id = u.id
      ORDER BY dn.created_at DESC
    `);
    return res.json(result.rows.map(row => {
      // Converter created_at e updated_at para número (timestamp ou bigint)
      let createdAt = row.created_at;
      let updatedAt = row.updated_at;
      
      if (createdAt instanceof Date) {
        createdAt = createdAt.getTime();
      } else if (typeof createdAt === 'string') {
        createdAt = new Date(createdAt).getTime();
      } else if (typeof createdAt === 'number') {
        // Já é número
      } else {
        createdAt = Date.now();
      }
      
      if (updatedAt instanceof Date) {
        updatedAt = updatedAt.getTime();
      } else if (typeof updatedAt === 'string') {
        updatedAt = new Date(updatedAt).getTime();
      } else if (typeof updatedAt === 'number') {
        // Já é número
      } else {
        updatedAt = Date.now();
      }
      
      // Verificar se enabled existe ou se é 'active'
      const enabled = row.enabled !== undefined ? row.enabled : (row.active !== undefined ? row.active : true);
      
      return {
        id: String(row.id),
        designerId: String(row.designer_id),
        designerName: row.designer_name,
        type: row.type,
        h1: row.h1,
        h2: row.h2,
        h3: row.h3,
        enabled: enabled,
        createdAt: Number(createdAt),
        updatedAt: Number(updatedAt)
      };
    }));
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
});

app.get('/api/designer-notifications/designer/:designerId', async (req: Request, res: Response) => {
  try {
    const { designerId } = req.params;
    const result = await pool.query(
      'SELECT * FROM designer_notifications WHERE designer_id = $1 AND enabled = true ORDER BY created_at DESC LIMIT 1',
      [designerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }
    const row = result.rows[0];
    return res.json({
      id: row.id,
      designerId: row.designer_id,
      type: row.type,
      h1: row.h1,
      h2: row.h2,
      h3: row.h3,
      enabled: row.enabled,
      createdAt: parseInt(row.created_at),
      updatedAt: parseInt(row.updated_at)
    });
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
    const designerCheck = await pool.query('SELECT id FROM users WHERE id = $1', [designerId]);
    if (designerCheck.rows.length === 0) {
      console.error('❌ Designer não encontrado:', designerId);
      return res.status(404).json({ error: 'Designer não encontrado' });
    }
    console.log('✅ Designer encontrado:', designerCheck.rows[0].id);
    
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
      // Verificar estrutura da tabela para saber se created_at/updated_at são timestamp ou bigint
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
        // Se for timestamp, converter número para Date
        createdAtValue = new Date(now);
        updatedAtValue = new Date(now);
      } else {
        // Se for bigint, usar número diretamente
        createdAtValue = now;
        updatedAtValue = now;
      }
      
      // Verificar se a coluna é 'enabled' ou 'active'
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
      
      // Construir query de forma segura
      const columnName = enabledColumnName === 'active' ? 'active' : 'enabled';
      await pool.query(
        `INSERT INTO designer_notifications (id, designer_id, type, h1, h2, h3, ${columnName}, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, designerId, type, h1?.trim() || null, h2?.trim() || null, h3?.trim() || null, enabled !== false, createdAtValue, updatedAtValue]
      );
    } catch (insertError: any) {
      console.error('❌ Erro ao inserir no banco:', insertError);
      console.error('❌ Código do erro:', insertError?.code);
      console.error('❌ Mensagem:', insertError?.message);
      console.error('❌ Detalhes:', insertError?.detail);
      throw insertError;
    }
    console.log('✅ Notificação inserida com sucesso, ID:', id);
    
    const result = await pool.query('SELECT * FROM designer_notifications WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      console.error('❌ Notificação criada mas não encontrada após inserção');
      return res.status(500).json({ error: 'Notificação criada mas não foi possível recuperá-la' });
    }
    
    const row = result.rows[0];
    
    // Converter created_at e updated_at para número
    let createdAt = row.created_at;
    let updatedAt = row.updated_at;
    
    if (createdAt instanceof Date) {
      createdAt = createdAt.getTime();
    } else if (typeof createdAt === 'string') {
      createdAt = new Date(createdAt).getTime();
    } else if (typeof createdAt === 'number') {
      // Já é número
    } else {
      createdAt = Date.now();
    }
    
    if (updatedAt instanceof Date) {
      updatedAt = updatedAt.getTime();
    } else if (typeof updatedAt === 'string') {
      updatedAt = new Date(updatedAt).getTime();
    } else if (typeof updatedAt === 'number') {
      // Já é número
    } else {
      updatedAt = Date.now();
    }
    
    const notificationEnabled = row.enabled !== undefined ? row.enabled : (row.active !== undefined ? row.active : true);
    
    console.log('✅ Notificação criada com sucesso:', row.id);
    return res.json({
      id: String(row.id),
      designerId: String(row.designer_id),
      type: row.type,
      h1: row.h1,
      h2: row.h2,
      h3: row.h3,
      enabled: notificationEnabled,
      createdAt: Number(createdAt),
      updatedAt: Number(updatedAt)
    });
  } catch (error: any) {
    console.error('Erro ao criar notificação:', error);
    
    // Verificar se é erro de tabela não encontrada
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return res.status(500).json({ 
        error: 'Tabela designer_notifications não encontrada. Execute o script SQL create_designer_notifications_table.sql no banco de dados.',
        details: error?.message 
      });
    }
    
    // Verificar se é erro de foreign key
    if (error?.code === '23503') {
      return res.status(400).json({ 
        error: 'Designer não encontrado ou inválido',
        details: error?.message 
      });
    }
    
    // Verificar se é erro de constraint
    if (error?.code === '23514') {
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
    await pool.query(
      `UPDATE designer_notifications 
       SET type = $1, h1 = $2, h2 = $3, h3 = $4, enabled = $5, updated_at = $6
       WHERE id = $7`,
      [type, h1 || null, h2 || null, h3 || null, enabled !== false, now, id]
    );
    const result = await pool.query('SELECT * FROM designer_notifications WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }
    const row = result.rows[0];
    return res.json({
      id: row.id,
      designerId: row.designer_id,
      type: row.type,
      h1: row.h1,
      h2: row.h2,
      h3: row.h3,
      enabled: row.enabled,
      createdAt: parseInt(row.created_at),
      updatedAt: parseInt(row.updated_at)
    });
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
    await pool.query(
      'UPDATE designer_notifications SET enabled = $1, updated_at = $2 WHERE id = $3',
      [enabled, now, id]
    );
    const result = await pool.query('SELECT * FROM designer_notifications WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }
    const row = result.rows[0];
    return res.json({
      id: row.id,
      designerId: row.designer_id,
      type: row.type,
      h1: row.h1,
      h2: row.h2,
      h3: row.h3,
      enabled: row.enabled,
      createdAt: parseInt(row.created_at),
      updatedAt: parseInt(row.updated_at)
    });
  } catch (error: any) {
    console.error('Erro ao alterar status da notificação:', error);
    return res.status(500).json({ error: 'Erro ao alterar status', details: error?.message });
  }
});

app.delete('/api/designer-notifications/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM designer_notifications WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar notificação:', error);
    return res.status(500).json({ error: 'Erro ao deletar notificação', details: error?.message });
  }
});

// ============ HEALTH CHECK ============
app.get('/api/health', (req: Request, res: Response) => {
  return res.json({ status: 'ok', timestamp: Date.now() });
});

// ============ LOCAL SERVER ============
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Dev server running on port ${PORT}`);
  });
}

// ============ VERCEL HANDLER ============
// Para Vercel, exportamos o app diretamente
// O Vercel automaticamente cria rotas para /api/* quando há api/index.ts
export default app;
