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
    const id = `session-${Date.now()}`;
    const timestamp = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const existing = await pool.query(
      'SELECT * FROM work_sessions WHERE user_id = $1 AND timestamp >= $2 ORDER BY timestamp ASC LIMIT 1',
      [userId, todayStart]
    );
    if (existing.rows.length > 0) {
      const s = existing.rows[0];
      return res.json({ id: s.id, userId: s.user_id, timestamp: parseInt(s.timestamp) });
    }
    await pool.query(
      'INSERT INTO work_sessions (id, user_id, timestamp) VALUES ($1, $2, $3)',
      [id, userId, timestamp]
    );
    return res.json({ id, userId, timestamp });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar sessão' });
  }
});

// ============ DEMANDS ============
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
        timestamp: parseInt(d.timestamp)
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
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO demands (id, user_id, user_name, total_quantity, total_points, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, userId, userName, totalQuantity, totalPoints, timestamp]
    );
    for (const item of items) {
      await client.query(
        'INSERT INTO demand_items (demand_id, art_type_id, art_type_label, points_per_unit, quantity, variation_quantity, variation_points, total_points) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, item.artTypeId, item.artTypeLabel, item.pointsPerUnit, item.quantity, item.variationQuantity || 0, item.variationPoints || 0, item.totalPoints]
      );
    }
    await client.query('COMMIT');
    
    return res.json({ id, userId, userName, items, totalQuantity, totalPoints, timestamp });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Erro ao criar demanda' });
  } finally {
    client.release();
  }
});

app.delete('/api/demands/:id', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');
    await client.query('DELETE FROM demand_items WHERE demand_id = $1', [id]);
    await client.query('DELETE FROM demands WHERE id = $1', [id]);
    await client.query('COMMIT');
    return res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
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
      viewedAt: f.viewed_at ? parseInt(f.viewed_at) : undefined
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
      motivationalMessage,
      motivationalMessageEnabled,
      nextAwardImage,
      chartEnabled,
      showAwardsChart,
      awardsHasUpdates
    } = req.body;
    
    // Se houver alterações relacionadas a premiações, ativar flag de atualizações
    const hasAwardRelatedChanges = 
      motivationalMessage !== undefined ||
      motivationalMessageEnabled !== undefined ||
      nextAwardImage !== undefined ||
      chartEnabled !== undefined ||
      showAwardsChart !== undefined;
    
    // Atualizar campos existentes e novos campos (usando COALESCE para não sobrescrever se null)
    await pool.query(
      `UPDATE system_settings SET 
        logo_url = COALESCE($1, logo_url), 
        brand_title = COALESCE($2, brand_title), 
        login_subtitle = COALESCE($3, login_subtitle), 
        variation_points = COALESCE($4, variation_points),
        motivational_message = COALESCE($5, motivational_message),
        motivational_message_enabled = COALESCE($6, motivational_message_enabled),
        next_award_image = COALESCE($7, next_award_image),
        chart_enabled = COALESCE($8, chart_enabled),
        show_awards_chart = COALESCE($9, show_awards_chart),
        awards_has_updates = COALESCE($10, awards_has_updates)
      WHERE id = 1`,
      [
        logoUrl, 
        brandTitle, 
        loginSubtitle, 
        variationPoints,
        motivationalMessage,
        motivationalMessageEnabled,
        nextAwardImage,
        chartEnabled,
        showAwardsChart,
        awardsHasUpdates
      ]
    );
    
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
          motivationalMessage,
          motivationalMessageEnabled,
          nextAwardImage,
          chartEnabled
        } = req.body;
        await pool.query(
          `UPDATE system_settings SET 
            logo_url = COALESCE($1, logo_url), 
            brand_title = COALESCE($2, brand_title), 
            login_subtitle = COALESCE($3, login_subtitle), 
            variation_points = COALESCE($4, variation_points),
            motivational_message = COALESCE($5, motivational_message),
            motivational_message_enabled = COALESCE($6, motivational_message_enabled),
            next_award_image = COALESCE($7, next_award_image),
            chart_enabled = COALESCE($8, chart_enabled),
            show_awards_chart = COALESCE($9, show_awards_chart),
            awards_has_updates = COALESCE($10, awards_has_updates)
          WHERE id = 1`,
          [
            logoUrl, 
            brandTitle, 
            loginSubtitle, 
            variationPoints,
            motivationalMessage,
            motivationalMessageEnabled,
            nextAwardImage,
            chartEnabled,
            showAwardsChart,
            awardsHasUpdates
          ]
        );
        
        // Se houver alterações relacionadas a premiações, ativar flag (exceto se awardsHasUpdates for explicitamente false)
        if (hasAwardRelatedChanges && awardsHasUpdates !== false) {
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
