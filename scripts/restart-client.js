#!/usr/bin/env node

/**
 * Script para reiniciar o servidor frontend (Vite) com rebuild forçado
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

async function startClient() {
  try {
    console.log('🚀 Iniciando servidor frontend com rebuild forçado...');
    const child = exec('npm run client:force');
    child.stdout?.pipe(process.stdout);
    child.stderr?.pipe(process.stderr);
    return child;
  } catch (error) {
    console.error('❌ Erro ao iniciar frontend:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('\n🔄 Reiniciando servidor frontend com rebuild forçado...\n');
  await killPort(5000);
  await startClient();
}

main().catch(console.error);

