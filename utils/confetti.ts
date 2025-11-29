import confetti from 'canvas-confetti';

/**
 * Dispara uma animação de confete para celebrar o vencedor do mês
 */
export const celebrateWinner = () => {
  console.log('🎊 celebrateWinner chamado!');
  
  try {
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ['#280FFF', '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();

    // Explosão central após um breve delay
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: colors
      });
      
      // Explosões adicionais para mais impacto
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 90,
          spread: 45,
          origin: { y: 0.5 },
          colors: colors
        });
      }, 200);
    }, 500);
    
    console.log('✅ Confete disparado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao disparar confete:', error);
  }
};

