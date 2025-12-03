#!/usr/bin/env node

/**
 * Script executado automaticamente após cada modificação de arquivo
 * Garante que os servidores estejam atualizados
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
  const filePath = process.argv[2] || '';
  const isBackendFile = filePath.includes('/api/') || filePath.includes('api/index.ts');
  const isFrontendFile = filePath.includes('/pages/') || 
                         filePath.includes('/components/') || 
                         filePath.includes('/context/') || 
                         filePath.includes('/utils/') ||
                         filePath.endsWith('.tsx') ||
                         filePath.endsWith('.ts') ||
                         filePath.endsWith('.css');

  const serverRunning = await checkPort(3001);
  const clientRunning = await checkPort(5000);

  console.log('\n📝 Arquivo modificado:', filePath || 'desconhecido');
  
  if (isBackendFile) {
    console.log('🔧 Arquivo do backend detectado');
    if (serverRunning) {
      console.log('✅ Backend está rodando com watch mode - reiniciará automaticamente');
      console.log('⏳ Aguarde 1-2 segundos para o restart...\n');
    } else {
      console.log('⚠️  Backend não está rodando');
      console.log('💡 Execute: npm run server\n');
    }
  }
  
  if (isFrontendFile) {
    console.log('🎨 Arquivo do frontend detectado');
    if (clientRunning) {
      console.log('✅ Frontend está rodando - hot reload deve atualizar automaticamente');
      console.log('💡 Se não atualizar, force refresh: Cmd+Shift+R (Mac) ou Ctrl+Shift+R (Win/Linux)\n');
    } else {
      console.log('⚠️  Frontend não está rodando');
      console.log('💡 Execute: npm run client\n');
    }
  }

  // Se nenhum servidor está rodando, sugerir npm run dev
  if (!serverRunning && !clientRunning) {
    console.log('💡 Para iniciar ambos os servidores: npm run dev\n');
  }
}

main().catch(console.error);


