import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.BINLID_DB || './binlid.db';
const SCHEMA_PATH = './schema.sql';

function initDb() {
  const db = new Database(DB_PATH);
  
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  
  // Load and execute schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);
  
  return db;
}

function main() {
  console.log('BinLid starting...');
  console.log('Database:', DB_PATH);
  
  const db = initDb();
  
  // Quick sanity check
  const spacesCount = db.prepare('SELECT COUNT(*) as n FROM spaces').get();
  const itemsCount = db.prepare('SELECT COUNT(*) as n FROM items').get();
  
  console.log('Spaces:', spacesCount.n);
  console.log('Items:', itemsCount.n);
  
  console.log('\nBinLid ready. Add items via:');
  console.log('  node src/cli.js add-space "Cupboard under stairs"');
  console.log('  node src/cli.js add-item "Bin lid" --space "Cupboard under stairs" --location "back left"');
  
  db.close();
}

main();
