import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { CalendarObservation } from '../types';

export const AdminControle: React.FC = () => {
  const { users, calendarObservations, addCalendarObservation, updateCalendarObservation, deleteCalendarObservation } = useApp();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedObservation, setSelectedObservation] = useState<CalendarObservation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDesigner, setSelectedDesigner] = useState<string>('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<'absence' | 'event' | 'note'>('note');

  const designers = users.filter(u => u.role === 'DESIGNER' && u.active);

  // Formatar data para YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Obter nome do mês em português
  const getMonthName = (date: Date): string => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[date.getMonth()];
  };

  // Obter nome dos dias da semana
  const getWeekDays = (): string[] => {
    return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  };

  // Obter dias do calendário
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const days: Array<{ date: Date; isCurrentMonth: boolean; dateStr: string }> = [];
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        dateStr: formatDate(date)
      });
    }
    
    return days;
  };

  // Obter observações para uma data específica
  const getObservationsForDate = (dateStr: string): CalendarObservation[] => {
    return calendarObservations.filter(obs => obs.date === dateStr);
  };

  // Obter observações para um designer específico em uma data
  const getObservationForDesigner = (dateStr: string, designerId: string): CalendarObservation | undefined => {
    return calendarObservations.find(obs => obs.date === dateStr && obs.designerId === designerId);
  };

  const calendarDays = getCalendarDays();
  const today = formatDate(new Date());

  // Navegar para mês anterior
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Navegar para próximo mês
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Ir para hoje
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Abrir modal para adicionar/editar observação
  const handleOpenModal = (dateStr: string, observation?: CalendarObservation) => {
    setSelectedDate(dateStr);
    if (observation) {
      setSelectedObservation(observation);
      setSelectedDesigner(observation.designerId);
      setNote(observation.note);
      setType(observation.type || 'note');
    } else {
      setSelectedObservation(null);
      setSelectedDesigner(designers.length > 0 ? designers[0].id : '');
      setNote('');
      setType('note');
    }
    setShowModal(true);
  };

  // Fechar modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDate(null);
    setSelectedObservation(null);
    setSelectedDesigner(designers.length > 0 ? designers[0].id : '');
    setNote('');
    setType('note');
  };

  // Salvar observação
  const handleSave = async () => {
    if (!selectedDate || !selectedDesigner || !note.trim()) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (selectedObservation) {
        // Editar
        await updateCalendarObservation(selectedObservation.id, {
          designerId: selectedDesigner,
          date: selectedDate,
          note: note.trim(),
          type
        });
      } else {
        // Criar
        await addCalendarObservation({
          designerId: selectedDesigner,
          date: selectedDate,
          note: note.trim(),
          type
        });
      }
      handleCloseModal();
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar observação');
    }
  };

  // Deletar observação
  const handleDelete = async (observation: CalendarObservation) => {
    if (!confirm(`Deseja realmente excluir esta observação?`)) {
      return;
    }

    try {
      await deleteCalendarObservation(observation.id);
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir observação');
    }
  };

  // Obter cor do tipo
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'absence':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700';
      case 'event':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600';
    }
  };

  // Obter label do tipo
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'absence':
        return 'Falta';
      case 'event':
        return 'Evento';
      default:
        return 'Nota';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="text-[#280FFF] dark:text-slate-300" size={24} />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Controle</h1>
          </div>
        </div>

        {/* Navegação do calendário */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="text-slate-600 dark:text-slate-400" size={20} />
            </button>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white min-w-[200px] text-center">
              {getMonthName(currentDate)} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronRight className="text-slate-600 dark:text-slate-400" size={20} />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Hoje
          </button>
        </div>

        {/* Grid do calendário */}
        <div className="grid grid-cols-7 gap-2">
          {/* Cabeçalho dos dias da semana */}
          {getWeekDays().map((day, index) => (
            <div
              key={index}
              className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2"
            >
              {day}
            </div>
          ))}

          {/* Dias do calendário */}
          {calendarDays.map((day, index) => {
            const isToday = day.dateStr === today;
            const observations = getObservationsForDate(day.dateStr);
            const hasObservations = observations.length > 0;

            return (
              <div
                key={index}
                className={`
                  min-h-[100px] p-2 border rounded-lg transition-all cursor-pointer
                  ${day.isCurrentMonth
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                  }
                  ${isToday ? 'ring-2 ring-[#280FFF] dark:ring-[#280FFF]' : ''}
                  ${hasObservations ? 'hover:shadow-md' : ''}
                `}
                onClick={() => handleOpenModal(day.dateStr)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`
                      text-sm font-medium
                      ${isToday
                        ? 'text-[#280FFF] dark:text-[#280FFF]'
                        : day.isCurrentMonth
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'text-slate-400 dark:text-slate-600'
                      }
                    `}
                  >
                    {day.date.getDate()}
                  </span>
                  {hasObservations && (
                    <div className="w-2 h-2 rounded-full bg-[#280FFF] dark:bg-[#280FFF]"></div>
                  )}
                </div>

                {/* Lista de observações */}
                <div className="space-y-1 mt-2">
                  {observations.slice(0, 2).map((obs) => {
                    const designer = designers.find(d => d.id === obs.designerId);
                    return (
                      <div
                        key={obs.id}
                        className={`
                          text-[10px] px-1.5 py-0.5 rounded border truncate
                          ${getTypeColor(obs.type || 'note')}
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(day.dateStr, obs);
                        }}
                        title={`${designer?.name || obs.designerName || 'Designer'}: ${obs.note}`}
                      >
                        <span className="font-medium">{getTypeLabel(obs.type || 'note')}:</span>{' '}
                        {designer?.name?.split(' - ')[1] || designer?.name || obs.designerName || 'Designer'}
                      </div>
                    );
                  })}
                  {observations.length > 2 && (
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 px-1">
                      +{observations.length - 2} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal para adicionar/editar observação */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {selectedObservation ? 'Editar Observação' : 'Nova Observação'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="text-slate-500 dark:text-slate-400" size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Data */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#280FFF] focus:border-transparent"
                />
              </div>

              {/* Designer */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Designer <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedDesigner}
                  onChange={(e) => setSelectedDesigner(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#280FFF] focus:border-transparent"
                >
                  <option value="">Selecione um designer</option>
                  {designers.map(designer => (
                    <option key={designer.id} value={designer.id}>
                      {designer.name.split(' - ')[1] || designer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tipo
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'absence' | 'event' | 'note')}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#280FFF] focus:border-transparent"
                >
                  <option value="note">Nota</option>
                  <option value="absence">Falta</option>
                  <option value="event">Evento</option>
                </select>
              </div>

              {/* Nota */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Observação <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  placeholder="Digite a observação..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#280FFF] focus:border-transparent resize-none"
                />
              </div>

              {/* Ações */}
              <div className="flex items-center gap-3 pt-4">
                {selectedObservation && (
                  <button
                    onClick={() => handleDelete(selectedObservation)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                )}
                <button
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#280FFF] hover:bg-[#1f0ccc] rounded-lg transition-colors"
                >
                  {selectedObservation ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

