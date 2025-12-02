#!/usr/bin/env node

/**
 * Script principal de automação que detecta mudanças e gerencia os servidores
 * Este script será chamado automaticamente após modificações
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { watch } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

let serverProcess = null;
let clientProcess = null;

async function checkPort(port) {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port} 2>/dev/null || echo ""`);
    return stdout.trim() !== '';
  } catch {
    return false;
  }
}

async function startServer() {
  if (await checkPort(3001)) {
    console.log('✅ Backend já está rodando');
    return;
  }
  
  console.log('🚀 Iniciando backend com watch mode...');
  serverProcess = exec('npm run server');
  serverProcess.stdout?.pipe(process.stdout);
  serverProcess.stderr?.pipe(process.stderr);
}

async function startClient() {
  if (await checkPort(5000)) {
    console.log('✅ Frontend já está rodando');
    return;
  }
  
  console.log('🚀 Iniciando frontend (Vite)...');
  clientProcess = exec('npm run client');
  clientProcess.stdout?.pipe(process.stdout);
  clientProcess.stderr?.pipe(process.stderr);
}

async function restartServer() {
  console.log('\n🔄 Reiniciando backend...');
  if (serverProcess) {
    serverProcess.kill();
  }
  await execAsync('lsof -ti:3001 | xargs kill -9 2>/dev/null || true');
  await new Promise(resolve => setTimeout(resolve, 1000));
  await startServer();
}

async function restartClient() {
  console.log('\n🔄 Reiniciando frontend com rebuild forçado...');
  if (clientProcess) {
    clientProcess.kill();
  }
  await execAsync('lsof -ti:5000 | xargs kill -9 2>/dev/null || true');
  await new Promise(resolve => setTimeout(resolve, 1000));
  await startClient();
}

async function main() {
  console.log('🤖 Sistema de Auto-Reload Ativado\n');
  
  // Iniciar servidores se não estiverem rodando
  await startServer();
  await new Promise(resolve => setTimeout(resolve, 2000));
  await startClient();
  
  console.log('\n✅ Servidores iniciados!');
  console.log('📝 Monitorando mudanças nos arquivos...\n');
  console.log('💡 Dicas:');
  console.log('   - Backend reinicia automaticamente com watch mode');
  console.log('   - Frontend tem hot reload automático');
  console.log('   - Force refresh no navegador: Cmd+Shift+R (Mac) ou Ctrl+Shift+R (Windows/Linux)\n');
  
  // Monitorar mudanças em arquivos do backend
  const apiPath = join(process.cwd(), 'api');
  watch(apiPath, { recursive: true }, async (eventType, filename) => {
    if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
      console.log(`\n📝 Mudança detectada em: ${filename}`);
      await restartServer();
    }
  });
  
  // Monitorar mudanças em arquivos do frontend
  const frontendPaths = [
    join(process.cwd(), 'pages'),
    join(process.cwd(), 'components'),
    join(process.cwd(), 'context'),
    join(process.cwd(), 'utils'),
  ];
  
  frontendPaths.forEach(path => {
    watch(path, { recursive: true }, async (eventType, filename) => {
      if (filename && (filename.endsWith('.tsx') || filename.endsWith('.ts') || filename.endsWith('.css'))) {
        console.log(`\n📝 Mudança detectada em: ${filename}`);
        console.log('💡 O Vite deve recarregar automaticamente. Se não funcionar, force refresh no navegador.');
      }
    });
  });
  
  // Manter o processo vivo
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Encerrando servidores...');
    if (serverProcess) serverProcess.kill();
    if (clientProcess) clientProcess.kill();
    process.exit(0);
  });
}

main().catch(console.error);

