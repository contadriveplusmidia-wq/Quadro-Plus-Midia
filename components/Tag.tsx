import React, { useState, useEffect } from 'react';
import { X, Tag as TagIcon } from 'lucide-react';
import { Tag as TagType } from '../types';

interface TagProps {
  tag: TagType;
  onRemove?: () => void;
  selected?: boolean;
  onClick?: () => void;
  showIcon?: boolean;
}

// Função para calcular a luminância de uma cor (0-1)
const getLuminance = (hex: string): number => {
  try {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    
    // Aplicar correção gamma
    const [rLinear, gLinear, bLinear] = [r, g, b].map(val => {
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    
    // Calcular luminância relativa
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  } catch {
    return 0.5; // Retornar valor médio em caso de erro
  }
};

// Função para determinar se deve usar texto claro ou escuro
const shouldUseLightText = (color: string): boolean => {
  try {
    const luminance = getLuminance(color);
    return luminance < 0.5; // Se a cor for escura (luminância < 0.5), use texto claro
  } catch {
    return false;
  }
};

// Função para ajustar cor para dark mode (clarear cores muito escuras)
const adjustColorForDarkMode = (color: string, isDark: boolean): string => {
  if (!isDark || !color) return color;
  
  try {
    const cleanHex = color.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    
    // Se a cor for muito escura, clarear para melhor legibilidade
    const luminance = getLuminance(color);
    if (luminance < 0.25) {
      const factor = 1.4; // Clarear em 40%
      const newR = Math.min(255, Math.round(r * factor));
      const newG = Math.min(255, Math.round(g * factor));
      const newB = Math.min(255, Math.round(b * factor));
      return `rgb(${newR}, ${newG}, ${newB})`;
    }
    
    return color;
  } catch {
    return color;
  }
};

export const Tag: React.FC<TagProps> = ({ 
  tag, 
  onRemove, 
  selected = false, 
  onClick,
  showIcon = false 
}) => {
  const [isDark, setIsDark] = useState(false);
  
  // Detectar tema dark/light
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    return () => observer.disconnect();
  }, []);
  
  const baseStyles = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm font-medium transition-all duration-200 border";
  
  // Tag selecionada - sempre usa cores do tema
  if (selected) {
    return (
      <span
        className={`
          ${baseStyles}
          bg-purple-600 dark:bg-purple-500 
          text-white 
          border-purple-700 dark:border-purple-400
          hover:bg-purple-700 dark:hover:bg-purple-600 
          hover:border-purple-800 dark:hover:border-purple-500
          shadow-sm
          ${onClick ? 'cursor-pointer' : ''}
        `.trim().replace(/\s+/g, ' ')}
        onClick={onClick}
      >
        {showIcon && <TagIcon size={14} className="text-white" />}
        <span>{tag.name}</span>
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors text-white"
            aria-label={`Remover tag ${tag.name}`}
          >
            <X size={12} />
          </button>
        )}
      </span>
    );
  }
  
  // Tag com cor customizada
  if (tag.color) {
    const useLightText = shouldUseLightText(tag.color);
    const adjustedColor = adjustColorForDarkMode(tag.color, isDark);
    
    return (
      <span
        className={`
          ${baseStyles}
          ${useLightText 
            ? 'text-white' 
            : 'text-slate-900 dark:text-slate-900'
          }
          hover:opacity-90 dark:hover:opacity-95 
          hover:shadow-md
          ${onClick ? 'cursor-pointer' : ''}
        `.trim().replace(/\s+/g, ' ')}
        onClick={onClick}
        style={{
          backgroundColor: adjustedColor,
          borderColor: adjustedColor,
        }}
      >
        {showIcon && (
          <TagIcon 
            size={14} 
            className={useLightText ? 'text-white' : 'text-slate-900 dark:text-slate-900'} 
          />
        )}
        <span>{tag.name}</span>
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className={`
              ml-1 rounded-full p-0.5 transition-colors
              ${useLightText 
                ? 'hover:bg-white/20 text-white' 
                : 'hover:bg-black/10 dark:hover:bg-black/20 text-slate-900 dark:text-slate-900'
              }
            `.trim().replace(/\s+/g, ' ')}
            aria-label={`Remover tag ${tag.name}`}
          >
            <X size={12} />
          </button>
        )}
      </span>
    );
  }
  
  // Tag padrão sem cor customizada - usa tokens do tema
  return (
    <span
      className={`
        ${baseStyles}
        bg-purple-50 dark:bg-purple-900/30 
        text-purple-700 dark:text-purple-300
        border-purple-200 dark:border-purple-700/50
        hover:bg-purple-100 dark:hover:bg-purple-900/40
        hover:border-purple-300 dark:hover:border-purple-600/50
        ${onClick ? 'cursor-pointer' : ''}
      `.trim().replace(/\s+/g, ' ')}
      onClick={onClick}
    >
      {showIcon && (
        <TagIcon 
          size={14} 
          className="text-purple-700 dark:text-purple-300" 
        />
      )}
      <span>{tag.name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors text-purple-700 dark:text-purple-300"
          aria-label={`Remover tag ${tag.name}`}
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
};
