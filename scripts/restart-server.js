#!/usr/bin/env node

/**
 * Script para reiniciar o servidor backend automaticamente
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function killPort(port) {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port} 2>/dev/null || echo ""`);
    if (stdout.trim()) {
      await execAsync(`kill -9 ${stdout.trim()}`);
      console.log(`✅ Processo na porta ${port} encerrado`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    // Ignorar erros se não houver processo
  }
}

async function startServer() {
  try {
    console.log('🚀 Iniciando servidor backend...');
    const child = exec('npm run server:once');
    child.stdout?.pipe(process.stdout);
    child.stderr?.pipe(process.stderr);
    return child;
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('\n🔄 Reiniciando servidor backend...\n');
  await killPort(3001);
  await startServer();
}

main().catch(console.error);

