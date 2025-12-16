import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  min?: string;
  max?: string;
  title?: string;
  placeholder?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  min,
  max,
  title,
  placeholder = 'Selecione uma data'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isDark, setIsDark] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Detectar tema
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Inicializar mês atual com base na data selecionada ou usar mês atual
  useEffect(() => {
    if (value) {
      // Parse manual para evitar problemas de timezone
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    } else {
      // Se não há valor, usar mês atual
      const now = new Date();
      setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    }
  }, [value]);

  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return placeholder;
    // IMPORTANTE: Parse manual da string YYYY-MM-DD para evitar problemas de timezone
    // new Date("2025-12-02") interpreta como UTC, causando deslocamento de -1 dia no Brasil (UTC-3)
    // Solução: fazer parse manual e criar data no timezone local
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month - 1 porque getMonth() retorna 0-11
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // getDay() retorna: 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
    // Agora incluímos domingo no calendário (7 dias por semana)
    const startDay = firstDay.getDay(); // 0-6 (Domingo-Sábado)
    
    // Adicionar dias do mês anterior para completar a primeira semana (começando no domingo)
    if (startDay > 0) {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
      
      // Adicionar dias do mês anterior começando do último dia
      for (let i = startDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        days.push(new Date(prevYear, prevMonth, day));
      }
    }

    // Adicionar dias do mês atual
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    // Adicionar dias do próximo mês para completar a última semana (até sábado)
    // Calcular quantos dias faltam para completar múltiplos de 7 (7 dias por semana)
    const totalDays = days.length;
    const remainder = totalDays % 7;
    const daysNeeded = remainder === 0 ? 0 : 7 - remainder;
    
    if (daysNeeded > 0) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      
      for (let day = 1; day <= daysNeeded; day++) {
        days.push(new Date(nextYear, nextMonth, day));
      }
    }

    return days;
  };

  const isDateDisabled = (date: Date): boolean => {
    const dateStr = formatDateForInput(date);
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  const isDateSelected = (date: Date): boolean => {
    if (!value) return false;
    const dateStr = formatDateForInput(date);
    return dateStr === value;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear();
  };

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    onChange(formatDateForInput(date));
    setIsOpen(false);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    const todayStr = formatDateForInput(today);
    if (!isDateDisabled(today)) {
      onChange(todayStr);
      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const days = getDaysInMonth(currentMonth);

  return (
    <div className="relative" ref={pickerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="relative cursor-pointer"
      >
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none z-10" size={16} />
        <input
          type="text"
          readOnly
          value={formatDisplayDate(value)}
          placeholder={placeholder}
          className="pl-10 pr-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer shadow-sm hover:shadow w-full"
          title={title}
        />
      </div>

      {isOpen && (
        <div className={`
          absolute top-full left-0 mt-2 z-[100]
          bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl
          p-4 min-w-[280px] max-w-[320px]
        `}>
          {/* Header do Calendário */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePreviousMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Dias da Semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div
                key={day}
                className={`text-xs font-semibold text-center py-1 ${
                  day === 'Dom' 
                    ? 'text-slate-300 dark:text-slate-600' 
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid de Dias */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, idx) => {
              const disabled = isDateDisabled(date);
              const selected = isDateSelected(date);
              const today = isToday(date);
              const currentMonthDay = isCurrentMonth(date);
              const isSunday = date.getDay() === 0; // 0 = Domingo

              return (
                <button
                  key={idx}
                  onClick={() => handleDateClick(date)}
                  disabled={disabled || isSunday}
                  className={`
                    aspect-square text-sm font-medium rounded-lg transition-all duration-200
                    ${isSunday
                      ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed opacity-30'
                      : disabled
                      ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                      : selected
                      ? 'bg-brand-600 text-white shadow-md hover:bg-brand-700'
                      : today
                      ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-slate-300 hover:bg-brand-100 dark:hover:bg-brand-900/40'
                      : currentMonthDay
                      ? 'text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                      : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 opacity-50'
                    }
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleClear}
              className="flex-1 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Limpar
            </button>
            <button
              onClick={handleToday}
              className="flex-1 px-3 py-2 text-sm font-medium text-brand-600 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

