import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

const connectDB = async () => {
  if (dbInstance) return;

  try {
    console.log('🔄 Connecting to local SQLite Database...');
    dbInstance = await open({
      filename: path.join(__dirname, '..', 'careerbot.db'),
      driver: sqlite3.Database
    });

    // Initialize Schema natively
    await dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sessionId TEXT UNIQUE NOT NULL,
        preferences TEXT,
        lastActive DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        title TEXT DEFAULT 'New Conversation',
        mode TEXT DEFAULT 'general',
        isActive INTEGER DEFAULT 1,
        messages TEXT DEFAULT '[]',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS resume_analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sessionId TEXT NOT NULL,
        resumeText TEXT,
        analysis TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log(`✅ SQLite Database connected successfully securely on disk!`);
  } catch (error) {
    console.error('❌ SQLite connection failed:', error.message);
  }
};

export const isDBConnected = () => !!dbInstance;
export const getDB = () => dbInstance;
export default connectDB;
