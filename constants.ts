import { ArtType, Demand, User, WorkSession, DemandItem } from './types';

export const INITIAL_ART_TYPES: ArtType[] = [
  { id: '1', label: 'Arte Única', points: 10, order: 0 },
  { id: '2', label: 'Feed + Storys', points: 25, order: 1 },
  { id: '3', label: 'Carrossel', points: 40, order: 2 },
  { id: '4', label: 'Banner Site', points: 30, order: 3 },
  { id: '5', label: 'Tabela de Preços', points: 50, order: 4 },
  { id: '6', label: 'Criação de Categoria', points: 15, order: 5 },
  { id: '7', label: 'Variação de Formato', points: 5, order: 6 },
  { id: '8', label: 'Edição de Vídeo (Reels)', points: 60, order: 7 },
  { id: '9', label: 'Outros', points: 10, order: 8 },
];

export const MOCK_USERS: User[] = [
  { id: 'd1', name: 'Designer 01 - Davi', password: '123', role: 'DESIGNER', active: true, avatarUrl: 'https://ui-avatars.com/api/?name=Davi&background=8b5cf6&color=fff' },
  { id: 'd2', name: 'Designer 02 - Guilherme', password: '123', role: 'DESIGNER', active: true, avatarUrl: 'https://ui-avatars.com/api/?name=Guilherme&background=06b6d4&color=fff' },
  { id: 'd3', name: 'Designer 03 - Paulo', password: '123', role: 'DESIGNER', active: true, avatarUrl: 'https://ui-avatars.com/api/?name=Paulo&background=ec4899&color=fff' },
  { id: 'a1', name: 'Administrador', password: '123', role: 'ADM', active: true, avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=1e293b&color=fff' },
];

// Generate fake history
const generateMockHistory = (): { demands: Demand[], sessions: WorkSession[] } => {
  const demands: Demand[] = [];
  const sessions: WorkSession[] = [];
  const now = new Date();
  const designers = MOCK_USERS.filter(u => u.role === 'DESIGNER');
  
  for (let i = 0; i < 15; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    
    designers.forEach(user => {
      // 90% chance of working that day
      if (Math.random() > 0.1) {
        // Create Work Session (Start time between 8am and 10am)
        const startHour = 8 + Math.floor(Math.random() * 2);
        const startMin = Math.floor(Math.random() * 60);
        const sessionTime = new Date(day);
        sessionTime.setHours(startHour, startMin, 0, 0);
        
        sessions.push({
          id: `session-${i}-${user.id}`,
          userId: user.id,
          timestamp: sessionTime.getTime()
        });

        // Add Demands
        const tasksCount = Math.floor(Math.random() * 4) + 1; // 1 to 5 demands per day
        for (let k = 0; k < tasksCount; k++) {
          
          // Generate items for this demand
          const items: DemandItem[] = [];
          const itemsInDemand = Math.floor(Math.random() * 3) + 1; // 1 to 3 items per demand

          for(let j=0; j < itemsInDemand; j++) {
            const art = INITIAL_ART_TYPES[Math.floor(Math.random() * INITIAL_ART_TYPES.length)];
            const quantity = Math.random() > 0.9 ? 2 : 1; 
            items.push({
                artTypeId: art.id,
                artTypeLabel: art.label,
                pointsPerUnit: art.points,
                quantity: quantity,
                totalPoints: art.points * quantity
            });
          }

          const totalPoints = items.reduce((acc, curr) => acc + curr.totalPoints, 0);
          
          // Exclude 'Variação de Formato' (ID 7) from art count
          const totalQuantity = items.reduce((acc, curr) => {
             const isVariation = curr.artTypeId === '7' || curr.artTypeLabel.toLowerCase().includes('variação');
             return acc + (isVariation ? 0 : curr.quantity);
          }, 0);

          // Random time after start time
          const demandTime = sessionTime.getTime() + (Math.random() * 28800000); // + up to 8 hours

          demands.push({
            id: `mock-${i}-${user.id}-${k}`,
            userId: user.id,
            userName: user.name,
            items: items,
            totalQuantity: totalQuantity,
            totalPoints: totalPoints,
            timestamp: demandTime
          });
        }
      }
    });
  }
  return { 
    demands: demands.sort((a, b) => b.timestamp - a.timestamp), 
    sessions 
  };
};

const mockData = generateMockHistory();
export const MOCK_HISTORY = mockData.demands;
export const MOCK_SESSIONS = mockData.sessions;