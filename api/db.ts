import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Obter diretório atual (ESModules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho para o arquivo database.db na raiz do projeto
const dbPath = path.join(__dirname, '..', 'database.db');

// Criar conexão SQLite
// WAL mode para melhor performance e concorrência
const db = new Database(dbPath);

// Habilitar WAL mode (Write-Ahead Logging) para melhor performance
db.pragma('journal_mode = WAL');

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

console.log('✅ Conectado ao banco de dados SQLite:', dbPath);

export default db;

