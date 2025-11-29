/**
 * Função utilitária para focar automaticamente no primeiro campo editável
 * de um container (modal, formulário, etc.)
 * 
 * @param container - Elemento HTML ou seletor CSS do container
 * @param delay - Delay em milissegundos antes de focar (útil para animações)
 */
export const autoFocus = (container?: HTMLElement | string | null, delay: number = 100) => {
  setTimeout(() => {
    try {
      let targetContainer: HTMLElement | null = null;

      // Se for string, tratar como seletor CSS
      if (typeof container === 'string') {
        targetContainer = document.querySelector(container);
      }
      // Se for HTMLElement, usar diretamente
      else if (container instanceof HTMLElement) {
        targetContainer = container;
      }
      // Se não fornecido, usar document.body
      else {
        targetContainer = document.body;
      }

      if (!targetContainer) {
        console.warn('autoFocus: Container não encontrado');
        return;
      }

      // Seletores para elementos editáveis, em ordem de prioridade
      const selectors = [
        'input:not([type="hidden"]):not([disabled]):not([readonly])',
        'textarea:not([disabled]):not([readonly])',
        'select:not([disabled])',
        '[contenteditable="true"]',
        'button:not([disabled])',
        'a[href]'
      ];

      // Tentar encontrar o primeiro elemento editável
      for (const selector of selectors) {
        const elements = targetContainer.querySelectorAll<HTMLElement>(selector);
        
        for (const element of Array.from(elements)) {
          // Verificar se o elemento está visível e não está oculto
          const style = window.getComputedStyle(element);
          const isVisible = 
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            element.offsetWidth > 0 &&
            element.offsetHeight > 0;

          if (isVisible && !element.hasAttribute('disabled')) {
            // Tentar focar no elemento
            try {
              element.focus();
              
              // Para inputs e textareas, selecionar o texto se houver
              if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                if (element.value) {
                  element.select();
                }
              }
              
              return;
            } catch (focusError) {
              // Se não conseguir focar, continuar para o próximo
              console.warn('autoFocus: Erro ao focar elemento:', focusError);
              continue;
            }
          }
        }
      }

      console.warn('autoFocus: Nenhum elemento editável encontrado');
    } catch (error) {
      console.error('autoFocus: Erro ao executar autoFocus:', error);
    }
  }, delay);
};

import { useEffect } from 'react';

/**
 * Hook React para autoFocus em modais e formulários
 * 
 * @param isOpen - Se o modal/formulário está aberto
 * @param containerRef - Ref do container (opcional)
 * @param delay - Delay em milissegundos
 */
export const useAutoFocus = (
  isOpen: boolean,
  containerRef?: React.RefObject<HTMLElement> | null,
  delay: number = 150
) => {
  useEffect(() => {
    if (isOpen) {
      const container = containerRef?.current || document.body;
      autoFocus(container, delay);
    }
  }, [isOpen, containerRef, delay]);
};

