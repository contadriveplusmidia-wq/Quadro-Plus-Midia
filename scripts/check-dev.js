#!/usr/bin/env node

/**
 * Script para verificar se os servidores de desenvolvimento estão rodando
 * e fornecer instruções para iniciá-los se necessário
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkPort(port) {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port} 2>/dev/null || echo ""`);
    return stdout.trim() !== '';
  } catch {
    return false;
  }
}

async function main() {
  const serverRunning = await checkPort(3001);
  const clientRunning = await checkPort(5000);

  console.log('\n📊 Status dos Servidores de Desenvolvimento:\n');
  console.log(`Backend (porta 3001):  ${serverRunning ? '✅ Rodando' : '❌ Parado'}`);
  console.log(`Frontend (porta 5000): ${clientRunning ? '✅ Rodando' : '❌ Parado'}\n`);

  if (!serverRunning || !clientRunning) {
    console.log('💡 Para iniciar os servidores, execute:');
    console.log('   npm run dev\n');
    console.log('   Ou inicie separadamente:');
    if (!serverRunning) console.log('   - npm run server  (em um terminal)');
    if (!clientRunning) console.log('   - npm run client  (em outro terminal)\n');
  } else {
    console.log('✅ Ambos os servidores estão rodando!\n');
    console.log('💡 Dicas:');
    console.log('   - O Vite tem hot reload automático');
    console.log('   - O backend reinicia automaticamente com --watch');
    console.log('   - Se as mudanças não aparecerem, force refresh no navegador (Cmd+Shift+R / Ctrl+Shift+R)\n');
  }
}

main().catch(console.error);


