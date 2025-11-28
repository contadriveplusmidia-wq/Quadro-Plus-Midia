import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const isProduction = process.env.DATABASE_URL?.includes('neon') || 
                     process.env.DATABASE_URL?.includes('vercel') ||
                     process.env.VERCEL === '1';

const isDevelopment = process.env.NODE_ENV !== 'production';

const pool = new Pool({
  connectionString:  process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined
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
      thumbnailUrl: l.thumbnail_url,
      orderIndex: l.order_index,
      createdAt: parseInt(l.created_at)
    })));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar aulas' });
  }
});

app.post('/api/lessons', async (req: Request, res: Response) => {
  try {
    const { title, description, videoUrl, thumbnailUrl } = req.body;
    const id = `lesson-${Date.now()}`;
    const createdAt = Date.now();
    const maxOrder = await pool.query('SELECT COALESCE(MAX(order_index), -1) + 1 as next FROM lessons');
    const orderIndex = maxOrder.rows[0].next;
    await pool.query(
      'INSERT INTO lessons (id, title, description, video_url, thumbnail_url, order_index, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, title, description || '', videoUrl, thumbnailUrl || null, orderIndex, createdAt]
    );
    return res.json({ id, title, description, videoUrl, thumbnailUrl, orderIndex, createdAt });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar aula' });
  }
});

app.put('/api/lessons/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, videoUrl, thumbnailUrl, orderIndex } = req.body;
    await pool.query(
      'UPDATE lessons SET title = COALESCE($1, title), description = COALESCE($2, description), video_url = COALESCE($3, video_url), thumbnail_url = COALESCE($4, thumbnail_url), order_index = COALESCE($5, order_index) WHERE id = $6',
      [title, description, videoUrl, thumbnailUrl, orderIndex, id]
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
      dailyGoal: s.daily_goal || 10
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

app.put('/api/settings', async (req: Request, res: Response) => {
  try {
    const { logoUrl, brandTitle, loginSubtitle, variationPoints, dailyGoal } = req.body;
    await pool.query(
      'UPDATE system_settings SET logo_url = COALESCE($1, logo_url), brand_title = COALESCE($2, brand_title), login_subtitle = COALESCE($3, login_subtitle), variation_points = COALESCE($4, variation_points), daily_goal = COALESCE($5, daily_goal) WHERE id = 1',
      [logoUrl, brandTitle, loginSubtitle, variationPoints, dailyGoal]
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar configurações' });
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
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar premiações' });
  }
});

app.post('/api/awards', async (req: Request, res: Response) => {
  try {
    const { designerId, designerName, month, description, imageUrl } = req.body;
    
    // Validação básica
    if (!designerId || !designerName || !month) {
      return res.status(400).json({ error: 'Campos obrigatórios: designerId, designerName, month' });
    }
    
    const id = `award-${Date.now()}`;
    const createdAt = Date.now();
    await pool.query(
      'INSERT INTO awards (id, designer_id, designer_name, month, description, image_url, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, designerId, designerName, month, description || '', imageUrl || null, createdAt]
    );
    return res.json({ id, designerId, designerName, month, description: description || '', imageUrl: imageUrl || null, createdAt });
  } catch (error: any) {
    console.error('Erro ao criar premiação:', error);
    return res.status(500).json({ error: 'Erro ao criar premiação', details: error?.message });
  }
});

app.delete('/api/awards/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM awards WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover premiação' });
  }
});

// ============ USEFUL LINKS ============
app.get('/api/useful-links', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM useful_links ORDER BY created_at DESC');
    return res.json(result.rows.map(l => ({
      id: l.id,
      title: l.title,
      url: l.url,
      imageUrl: l.image_url,
      createdAt: parseInt(l.created_at)
    })));
  } catch (error) {
    console.error('Erro ao buscar links:', error);
    return res.status(500).json({ error: 'Erro ao buscar links' });
  }
});

app.post('/api/useful-links', async (req: Request, res: Response) => {
  try {
    const { title, url, imageUrl } = req.body;
    
    if (!title || !url) {
      return res.status(400).json({ error: 'Campos obrigatórios: title, url' });
    }
    
    const id = `link-${Date.now()}`;
    const createdAt = Date.now();
    await pool.query(
      'INSERT INTO useful_links (id, title, url, image_url, created_at) VALUES ($1, $2, $3, $4, $5)',
      [id, title, url, imageUrl || null, createdAt]
    );
    return res.json({ id, title, url, imageUrl: imageUrl || null, createdAt });
  } catch (error: any) {
    console.error('Erro ao criar link:', error);
    return res.status(500).json({ error: 'Erro ao criar link', details: error?.message });
  }
});

app.put('/api/useful-links/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, url, imageUrl } = req.body;
    await pool.query(
      'UPDATE useful_links SET title = COALESCE($1, title), url = COALESCE($2, url), image_url = COALESCE($3, image_url) WHERE id = $4',
      [title, url, imageUrl, id]
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar link' });
  }
});

app.delete('/api/useful-links/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM useful_links WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover link' });
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
export default app;
