#!/usr/bin/env node

/**
 * Script de teste para validar os filtros de data
 * Simula a data 02/12/2025 (terça-feira) e verifica os resultados
 */

// Simular data: 02/12/2025 (terça-feira)
const testDate = new Date(2025, 11, 2); // mês 11 = dezembro (0-indexed)
const originalDate = Date;

// Mock Date para teste
global.Date = class extends originalDate {
  constructor(...args) {
    if (args.length === 0) {
      super(testDate.getTime());
    } else {
      super(...args);
    }
  }
  
  static now() {
    return testDate.getTime();
  }
};

// Função getDateRange (cópia da lógica do AdminDashboard.tsx)
function getDateRange(dateFilter, customStartDate, customEndDate) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);
  
  switch (dateFilter) {
    case 'hoje': {
      return { start: today.getTime(), end: todayEnd.getTime() };
    }
    case 'semana': {
      const dayOfWeek = today.getDay();
      const daysToSubtract = dayOfWeek;
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - daysToSubtract);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return { start: weekStart.getTime(), end: weekEnd.getTime() };
    }
    case 'mes': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      return { start: monthStart.getTime(), end: monthEnd.getTime() };
    }
    default:
      return { start: today.getTime(), end: todayEnd.getTime() };
  }
}

function formatDateForInput(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateBR(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('pt-BR');
}

console.log('🧪 Teste de Filtros de Data - Data Simulada: 02/12/2025 (Terça-feira)\n');

// Teste FILTRO "HOJE"
const hoje = getDateRange('hoje');
console.log('📅 FILTRO "HOJE":');
console.log(`   De: ${formatDateBR(hoje.start)} (${formatDateForInput(hoje.start)})`);
console.log(`   Até: ${formatDateBR(hoje.end)} (${formatDateForInput(hoje.end)})`);
console.log(`   ✅ Esperado: 02/12/2025 - 02/12/2025`);
console.log(`   ${formatDateForInput(hoje.start) === '2025-12-02' && formatDateForInput(hoje.end) === '2025-12-02' ? '✅ PASSOU' : '❌ FALHOU'}\n`);

// Teste FILTRO "SEMANA"
const semana = getDateRange('semana');
console.log('📅 FILTRO "SEMANA" (Domingo a Sábado):');
console.log(`   De: ${formatDateBR(semana.start)} (${formatDateForInput(semana.start)})`);
console.log(`   Até: ${formatDateBR(semana.end)} (${formatDateForInput(semana.end)})`);
console.log(`   ✅ Esperado: 30/11/2025 (domingo) até 06/12/2025 (sábado)`);
console.log(`   ${formatDateForInput(semana.start) === '2025-11-30' && formatDateForInput(semana.end) === '2025-12-06' ? '✅ PASSOU' : '❌ FALHOU'}\n`);

// Teste FILTRO "MÊS"
const mes = getDateRange('mes');
console.log('📅 FILTRO "MÊS":');
console.log(`   De: ${formatDateBR(mes.start)} (${formatDateForInput(mes.start)})`);
console.log(`   Até: ${formatDateBR(mes.end)} (${formatDateForInput(mes.end)})`);
console.log(`   ✅ Esperado: 01/12/2025 até 31/12/2025`);
console.log(`   ${formatDateForInput(mes.start) === '2025-12-01' && formatDateForInput(mes.end) === '2025-12-31' ? '✅ PASSOU' : '❌ FALHOU'}\n`);

console.log('✅ Todos os testes concluídos!');


