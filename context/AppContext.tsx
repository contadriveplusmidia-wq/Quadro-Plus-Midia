import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, ArtType, Demand, WorkSession, Feedback, Lesson, LessonProgress, SystemSettings, TimeFilter, AdminFilters, Award, UsefulLink, Tag } from '../types';

const API_URL = '';

type Theme = 'light' | 'dark';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  artTypes: ArtType[];
  demands: Demand[];
  workSessions: WorkSession[];
  feedbacks: Feedback[];
  lessons: Lesson[];
  lessonProgress: LessonProgress[];
  awards: Award[];
  usefulLinks: UsefulLink[];
  tags: Tag[];
  settings: SystemSettings;
  adminFilters: AdminFilters;
  loading: boolean;
  theme: Theme;
  toggleTheme: () => void;
  login: (name: string, password: string) => Promise<boolean>;
  logout: () => void;
  setAdminFilters: (filters: AdminFilters) => void;
  addDemand: (demand: Omit<Demand, 'id' | 'timestamp'>) => Promise<void>;
  deleteDemand: (id: string) => Promise<void>;
  startWorkSession: (userId: string) => Promise<void>;
  getTodaySession: (userId: string) => WorkSession | undefined;
  addFeedback: (feedback: Omit<Feedback, 'id' | 'createdAt' | 'viewed'>) => Promise<void>;
  markFeedbackViewed: (id: string) => Promise<void>;
  respondFeedback: (id: string, response: string) => Promise<void>;
  deleteFeedback: (id: string) => Promise<void>;
  addLesson: (lesson: Omit<Lesson, 'id' | 'createdAt' | 'orderIndex'>) => Promise<void>;
  updateLesson: (id: string, lesson: Partial<Lesson>) => Promise<void>;
  deleteLesson: (id: string) => Promise<void>;
  markLessonViewed: (lessonId: string, designerId: string) => Promise<void>;
  unmarkLessonViewed: (lessonId: string, designerId: string) => Promise<void>;
  addAward: (award: Omit<Award, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  deleteAward: (id: string) => Promise<void>;
  addUsefulLink: (link: Omit<UsefulLink, 'id' | 'createdAt'>) => Promise<boolean>;
  updateUsefulLink: (id: string, link: Partial<UsefulLink>) => Promise<void>;
  deleteUsefulLink: (id: string) => Promise<void>;
  addTag: (tag: Omit<Tag, 'id' | 'createdAt'>) => Promise<void>;
  updateTag: (id: string, tag: Partial<Tag>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, user: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addArtType: (artType: Omit<ArtType, 'id' | 'order'>) => Promise<void>;
  updateArtType: (id: string, artType: Partial<ArtType>) => Promise<void>;
  deleteArtType: (id: string) => Promise<void>;
  reorderArtTypes: (artTypes: ArtType[]) => Promise<void>;
  updateSettings: (settings: Partial<SystemSettings>) => Promise<void>;
  resetAwardsUpdates: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('currentUser');
      if (saved) {
        try {
          const user = JSON.parse(saved);
          // Verificar se é antes das 6h - desconectar se for
          const now = new Date();
          const currentHour = now.getHours();
          if (currentHour < 6) {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('loginTimestamp');
            localStorage.removeItem('loginDate');
            return null;
          }
          return user;
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [users, setUsers] = useState<User[]>([]);
  const [artTypes, setArtTypes] = useState<ArtType[]>([]);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [usefulLinks, setUsefulLinks] = useState<UsefulLink[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({});
  const [loading, setLoading] = useState(true);
  const [adminFilters, setAdminFilters] = useState<AdminFilters>({
    period: 'today',
    designerId: 'all'
  });
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Aplicar favicon dinamicamente
  useEffect(() => {
    // Sempre remover todos os favicons existentes primeiro
    const existingLinks = document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']");
    existingLinks.forEach(link => link.remove());
    
    if (settings.faviconUrl) {
      // Criar novo link para favicon com timestamp para forçar atualização
      const link = document.createElement('link');
      link.rel = 'icon';
      
      // Adicionar timestamp à URL para forçar atualização do cache do navegador
      const versionedFavicon = settings.faviconUrl.startsWith('data:')
        ? settings.faviconUrl // Base64 não pode ter query params
        : `${settings.faviconUrl}${settings.faviconUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
      
      link.href = versionedFavicon;
      
      // Detectar e definir tipo de imagem
      if (settings.faviconUrl.startsWith('data:')) {
        // Para base64, extrair o tipo da string data
        const match = settings.faviconUrl.match(/data:image\/(\w+);/);
        link.type = match ? `image/${match[1]}` : 'image/x-icon';
      } else {
        link.type = 'image/x-icon';
      }
      
      // Adicionar ao head
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [settings.faviconUrl]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const fetchData = async () => {
    try {
      const [usersRes, artTypesRes, demandsRes, sessionsRes, feedbacksRes, lessonsRes, awardsRes, linksRes, tagsRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/api/users`),
        fetch(`${API_URL}/api/art-types`),
        fetch(`${API_URL}/api/demands`),
        fetch(`${API_URL}/api/work-sessions`),
        fetch(`${API_URL}/api/feedbacks`),
        fetch(`${API_URL}/api/lessons`),
        fetch(`${API_URL}/api/awards`),
        fetch(`${API_URL}/api/useful-links`),
        fetch(`${API_URL}/api/tags`),
        fetch(`${API_URL}/api/settings`)
      ]);
      
      if (usersRes.ok) setUsers(await usersRes.json());
      if (artTypesRes.ok) setArtTypes(await artTypesRes.json());
      if (demandsRes.ok) setDemands(await demandsRes.json());
      if (sessionsRes.ok) setWorkSessions(await sessionsRes.json());
      if (feedbacksRes.ok) setFeedbacks(await feedbacksRes.json());
      if (lessonsRes.ok) setLessons(await lessonsRes.json());
      if (awardsRes.ok) setAwards(await awardsRes.json());
      if (linksRes.ok) setUsefulLinks(await linksRes.json());
      if (tagsRes.ok) setTags(await tagsRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetch(`${API_URL}/api/lesson-progress/${currentUser.id}`)
        .then(res => res.ok ? res.json() : [])
        .then(setLessonProgress)
        .catch(console.error);
    }
  }, [currentUser]);

  // Monitorar desconexão automática
  useEffect(() => {
    if (!currentUser) return;

    const checkAutoLogout = () => {
      const loginTimestamp = localStorage.getItem('loginTimestamp');
      const loginDate = localStorage.getItem('loginDate');
      
      if (!loginTimestamp || !loginDate) {
        // Se não tem timestamp, fazer logout por segurança
        console.log('🔒 Auto-logout: Sem timestamp de login');
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTimestamp');
        localStorage.removeItem('loginDate');
        return;
      }

      const loginTime = parseInt(loginTimestamp, 10);
      const currentTime = Date.now();
      const now = new Date();
      const currentHour = now.getHours();
      
      // Verificar se é antes das 6h da manhã - desconectar todos
      if (currentHour < 6) {
        console.log('🔒 Auto-logout: Antes das 6h da manhã - desconectando todos');
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTimestamp');
        localStorage.removeItem('loginDate');
        return;
      }
      
      // Verificar se mudou o dia (desconectar todos) - verificação mais robusta
      // Comparar datas normalizadas (sem hora) para detectar mudança de dia
      const loginDateObj = new Date(loginDate);
      loginDateObj.setHours(0, 0, 0, 0);
      
      const currentDateObj = new Date();
      currentDateObj.setHours(0, 0, 0, 0);
      
      const loginDateNormalized = loginDateObj.getTime();
      const currentDateNormalized = currentDateObj.getTime();
      const daysDifference = Math.floor((currentDateNormalized - loginDateNormalized) / (1000 * 60 * 60 * 24));
      
      if (daysDifference > 0 || loginDateObj.toDateString() !== currentDateObj.toDateString()) {
        console.log('🔒 Auto-logout: Mudou o dia - desconectando todos', { 
          loginDate: loginDateObj.toLocaleDateString('pt-BR'),
          currentDate: currentDateObj.toLocaleDateString('pt-BR'),
          daysDifference 
        });
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTimestamp');
        localStorage.removeItem('loginDate');
        return;
      }

      // Verificar se passou 6 horas para designers
      if (currentUser.role === 'DESIGNER') {
        const hoursConnected = (currentTime - loginTime) / (1000 * 60 * 60); // Converter para horas
        
        if (hoursConnected >= 6) {
          console.log('🔒 Auto-logout: Designer conectado há mais de 6 horas', { 
            hoursConnected: hoursConnected.toFixed(2),
            loginTime: new Date(loginTime).toLocaleString('pt-BR'),
            currentTime: new Date(currentTime).toLocaleString('pt-BR')
          });
          setCurrentUser(null);
          localStorage.removeItem('currentUser');
          localStorage.removeItem('loginTimestamp');
          localStorage.removeItem('loginDate');
          return;
        }
      }
    };

    // Verificar imediatamente ao montar
    checkAutoLogout();

    // Verificar a cada minuto
    const interval = setInterval(checkAutoLogout, 60000); // 60000ms = 1 minuto

    // Verificar quando a página ganha foco (usuário volta à aba)
    const handleFocus = () => {
      checkAutoLogout();
    };
    window.addEventListener('focus', handleFocus);

    // Verificar mudança de data (meia-noite) - verificação mais frequente
    const checkDateChange = () => {
      const currentDate = new Date().toDateString();
      const savedDate = localStorage.getItem('loginDate');
      if (savedDate && savedDate !== currentDate) {
        console.log('🔒 Auto-logout: Detecção de mudança de data', { savedDate, currentDate });
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTimestamp');
        localStorage.removeItem('loginDate');
      }
    };
    const dateCheckInterval = setInterval(checkDateChange, 30000); // Verificar a cada 30 segundos para detectar meia-noite mais rápido

    // Verificar também quando a visibilidade da página muda
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAutoLogout();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      clearInterval(dateCheckInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser]);

  const login = async (name: string, password: string): Promise<boolean> => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Verificar se é antes das 6h - não permitir login
      if (currentHour < 6) {
        alert('Login só é permitido a partir das 6h da manhã. Todos os usuários são desconectados antes das 6h.');
        return false;
      }
      
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password })
      });
      if (!res.ok) return false;
      const user = await res.json();
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      // Salvar timestamp do login e data do dia
      const loginTimestamp = Date.now();
      const loginDate = new Date().toDateString();
      localStorage.setItem('loginTimestamp', loginTimestamp.toString());
      localStorage.setItem('loginDate', loginDate);
      
      if (user.role === 'DESIGNER') {
        try {
          const sessionRes = await fetch(`${API_URL}/api/work-sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
          });
          if (sessionRes.ok) {
            const session = await sessionRes.json();
            if (session && session.id) {
              setWorkSessions(prev => {
                const exists = prev.some(s => s.id === session.id);
                return exists ? prev : [session, ...prev];
              });
            }
          } else {
            // Se retornou erro, verificar se é porque é antes das 6h
            const errorData = await sessionRes.json().catch(() => ({}));
            if (errorData.code === 'BEFORE_6AM') {
              alert('Registro de expediente só é permitido a partir das 6h da manhã.');
            }
          }
        } catch (e) {
          console.error('Error creating work session:', e);
        }
      }
      
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTimestamp');
    localStorage.removeItem('loginDate');
  };

  const addDemand = async (demand: Omit<Demand, 'id' | 'timestamp'>) => {
    const res = await fetch(`${API_URL}/api/demands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(demand)
    });
    const newDemand = await res.json();
    setDemands(prev => [newDemand, ...prev]);
  };

  const deleteDemand = async (id: string) => {
    await fetch(`${API_URL}/api/demands/${id}`, { method: 'DELETE' });
    setDemands(prev => prev.filter(d => d.id !== id));
  };

  const startWorkSession = async (userId: string) => {
    const res = await fetch(`${API_URL}/api/work-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const session = await res.json();
    setWorkSessions(prev => [session, ...prev]);
  };

  const getTodaySession = (userId: string): WorkSession | undefined => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return workSessions.find(s => 
      s.userId === userId && s.timestamp >= today.getTime()
    );
  };

  const addFeedback = async (feedback: Omit<Feedback, 'id' | 'createdAt' | 'viewed'>) => {
    const res = await fetch(`${API_URL}/api/feedbacks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback)
    });
    const newFeedback = await res.json();
    setFeedbacks(prev => [newFeedback, ...prev]);
  };

  const markFeedbackViewed = async (id: string) => {
    await fetch(`${API_URL}/api/feedbacks/${id}/view`, { method: 'PUT' });
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, viewed: true, viewedAt: Date.now() } : f));
  };

  const respondFeedback = async (id: string, response: string) => {
    await fetch(`${API_URL}/api/feedbacks/${id}/response`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response })
    });
    const responseAt = Date.now();
    setFeedbacks(prev => prev.map(f => 
      f.id === id ? { ...f, response, responseAt } : f
    ));
  };

  const deleteFeedback = async (id: string) => {
    await fetch(`${API_URL}/api/feedbacks/${id}`, { method: 'DELETE' });
    setFeedbacks(prev => prev.filter(f => f.id !== id));
  };

  const addLesson = async (lesson: Omit<Lesson, 'id' | 'createdAt' | 'orderIndex'>) => {
    const res = await fetch(`${API_URL}/api/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lesson)
    });
    const newLesson = await res.json();
    setLessons(prev => [...prev, newLesson]);
  };

  const updateLesson = async (id: string, lesson: Partial<Lesson>) => {
    await fetch(`${API_URL}/api/lessons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lesson)
    });
    setLessons(prev => prev.map(l => l.id === id ? { ...l, ...lesson } : l));
  };

  const deleteLesson = async (id: string) => {
    await fetch(`${API_URL}/api/lessons/${id}`, { method: 'DELETE' });
    setLessons(prev => prev.filter(l => l.id !== id));
  };

  const markLessonViewed = async (lessonId: string, designerId: string) => {
    const res = await fetch(`${API_URL}/api/lesson-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, designerId })
    });
    const progress = await res.json();
    setLessonProgress(prev => {
      const existing = prev.findIndex(p => p.lessonId === lessonId && p.designerId === designerId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = progress;
        return updated;
      }
      return [...prev, progress];
    });
  };

  const unmarkLessonViewed = async (lessonId: string, designerId: string) => {
    await fetch(`${API_URL}/api/lesson-progress/${lessonId}/${designerId}`, {
      method: 'DELETE'
    });
    setLessonProgress(prev => prev.filter(p => !(p.lessonId === lessonId && p.designerId === designerId)));
  };

  const addAward = async (award: Omit<Award, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('Enviando premiação:', award);
      const res = await fetch(`${API_URL}/api/awards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(award)
      });
      
      console.log('Resposta recebida:', res.status, res.statusText);
      
      if (!res.ok) {
        // Tentar ler como texto primeiro
        const text = await res.text();
        console.error('Erro na resposta:', text);
        
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          // Se não for JSON, usar o texto como erro
          errorData = { error: text || `Erro HTTP ${res.status}: ${res.statusText}` };
        }
        
        const errorMessage = errorData.error || errorData.details || `Erro ${res.status}: ${res.statusText}`;
        console.error('Erro ao criar premiação:', errorMessage);
        return { success: false, error: errorMessage };
      }
      
      const newAward = await res.json();
      console.log('Premiação criada com sucesso:', newAward);
      setAwards(prev => [newAward, ...prev]);
      
      // Recarregar settings para atualizar a flag de notificações
      try {
        const settingsRes = await fetch(`${API_URL}/api/settings`);
        if (settingsRes.ok) {
          const updatedSettings = await settingsRes.json();
          setSettings(updatedSettings);
        }
      } catch (settingsError) {
        console.error('Erro ao recarregar settings:', settingsError);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao criar premiação (catch):', error);
      const errorMessage = error.message || error.toString() || 'Erro de conexão com o servidor';
      return { success: false, error: errorMessage };
    }
  };

  const deleteAward = async (id: string) => {
    await fetch(`${API_URL}/api/awards/${id}`, { method: 'DELETE' });
    setAwards(prev => prev.filter(a => a.id !== id));
    
    // Recarregar settings para atualizar a flag de notificações
    try {
      const settingsRes = await fetch(`${API_URL}/api/settings`);
      if (settingsRes.ok) {
        const updatedSettings = await settingsRes.json();
        setSettings(updatedSettings);
      }
    } catch (settingsError) {
      console.error('Erro ao recarregar settings:', settingsError);
    }
  };

  const addUsefulLink = async (link: Omit<UsefulLink, 'id' | 'createdAt'> & { tagIds?: string[] }): Promise<boolean> => {
    try {
      const { tagIds, ...linkData } = link;
      const res = await fetch(`${API_URL}/api/useful-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...linkData, tagIds })
      });
      if (!res.ok) {
        console.error('Erro ao criar link:', await res.text());
        return false;
      }
      const newLink = await res.json();
      setUsefulLinks(prev => [newLink, ...prev]);
      return true;
    } catch (error) {
      console.error('Erro ao criar link:', error);
      return false;
    }
  };

  const updateUsefulLink = async (id: string, link: Partial<UsefulLink> & { tagIds?: string[] }) => {
    const { tagIds, ...linkData } = link;
    await fetch(`${API_URL}/api/useful-links/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...linkData, tagIds })
    });
    // Recarregar links para obter tags atualizadas
    const linksRes = await fetch(`${API_URL}/api/useful-links`);
    if (linksRes.ok) {
      setUsefulLinks(await linksRes.json());
    } else {
      setUsefulLinks(prev => prev.map(l => l.id === id ? { ...l, ...linkData } : l));
    }
  };

  const deleteUsefulLink = async (id: string) => {
    await fetch(`${API_URL}/api/useful-links/${id}`, { method: 'DELETE' });
    setUsefulLinks(prev => prev.filter(l => l.id !== id));
  };

  const addTag = async (tag: Omit<Tag, 'id' | 'createdAt'>) => {
    const res = await fetch(`${API_URL}/api/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tag)
    });
    const newTag = await res.json();
    setTags(prev => [...prev, newTag]);
  };

  const updateTag = async (id: string, tag: Partial<Tag>) => {
    await fetch(`${API_URL}/api/tags/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tag)
    });
    setTags(prev => prev.map(t => t.id === id ? { ...t, ...tag } : t));
  };

  const deleteTag = async (id: string) => {
    await fetch(`${API_URL}/api/tags/${id}`, { method: 'DELETE' });
    setTags(prev => prev.filter(t => t.id !== id));
  };

  const addUser = async (user: Omit<User, 'id'>) => {
    const res = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const newUser = await res.json();
    setUsers(prev => [...prev, newUser]);
  };

  const updateUser = async (id: string, user: Partial<User>) => {
    await fetch(`${API_URL}/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...user } : u));
  };

  const deleteUser = async (id: string) => {
    await fetch(`${API_URL}/api/users/${id}`, { method: 'DELETE' });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, active: false } : u));
  };

  const addArtType = async (artType: Omit<ArtType, 'id' | 'order'>) => {
    const res = await fetch(`${API_URL}/api/art-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(artType)
    });
    const newArtType = await res.json();
    setArtTypes(prev => [...prev, newArtType]);
  };

  const updateArtType = async (id: string, artType: Partial<ArtType>) => {
    await fetch(`${API_URL}/api/art-types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(artType)
    });
    setArtTypes(prev => prev.map(a => a.id === id ? { ...a, ...artType } : a));
  };

  const deleteArtType = async (id: string) => {
    await fetch(`${API_URL}/api/art-types/${id}`, { method: 'DELETE' });
    setArtTypes(prev => prev.filter(a => a.id !== id));
  };

  const reorderArtTypes = async (reorderedArtTypes: ArtType[]) => {
    await fetch(`${API_URL}/api/art-types/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artTypes: reorderedArtTypes })
    });
    setArtTypes(reorderedArtTypes);
  };

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    const res = await fetch(`${API_URL}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Erro desconhecido ao atualizar configurações' }));
      throw new Error(error.error || 'Erro ao atualizar configurações');
    }
    
    // Recarregar settings do servidor para garantir sincronização (especialmente para awardsHasUpdates)
    try {
      const settingsRes = await fetch(`${API_URL}/api/settings`);
      if (settingsRes.ok) {
        const updatedSettings = await settingsRes.json();
        setSettings(updatedSettings);
      } else {
        // Fallback: atualizar localmente se a requisição falhar
        setSettings(prev => ({ ...prev, ...newSettings }));
      }
    } catch (settingsError) {
      console.error('Erro ao recarregar settings:', settingsError);
      // Fallback: atualizar localmente se a requisição falhar
      setSettings(prev => ({ ...prev, ...newSettings }));
    }
  };

  const resetAwardsUpdates = async () => {
    await fetch(`${API_URL}/api/awards/reset-updates`, {
      method: 'PUT'
    });
    // Recarregar settings do servidor para garantir sincronização
    try {
      const settingsRes = await fetch(`${API_URL}/api/settings`);
      if (settingsRes.ok) {
        const updatedSettings = await settingsRes.json();
        setSettings(updatedSettings);
      }
    } catch (settingsError) {
      console.error('Erro ao recarregar settings:', settingsError);
      // Fallback: atualizar localmente se a requisição falhar
      setSettings(prev => ({ ...prev, awardsHasUpdates: false }));
    }
  };

  const refreshData = fetchData;

  return (
    <AppContext.Provider value={{
      currentUser,
      users,
      artTypes,
      demands,
      workSessions,
      feedbacks,
      lessons,
      lessonProgress,
      awards,
      usefulLinks,
      tags,
      settings,
      adminFilters,
      loading,
      theme,
      toggleTheme,
      login,
      logout,
      setAdminFilters,
      addDemand,
      deleteDemand,
      startWorkSession,
      getTodaySession,
      addFeedback,
      markFeedbackViewed,
      respondFeedback,
      deleteFeedback,
      addLesson,
      updateLesson,
      deleteLesson,
      markLessonViewed,
      unmarkLessonViewed,
      addAward,
      deleteAward,
      addUsefulLink,
      updateUsefulLink,
      deleteUsefulLink,
      addTag,
      updateTag,
      deleteTag,
      addUser,
      updateUser,
      deleteUser,
      addArtType,
      updateArtType,
      deleteArtType,
      reorderArtTypes,
      updateSettings,
      resetAwardsUpdates,
      refreshData
    }}>
      {children}
    </AppContext.Provider>
  );
};
