import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.BINLID_DB || './binlid.db';
const SCHEMA_PATH = path.join(process.cwd(), 'schema.sql');

export function getDb() {
  const db = new DatabaseSync(DB_PATH);
  
  // Ensure schema exists
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);
  
  return db;
}

export function addSpace(name, description = '') {
  const db = getDb();
  try {
    const insert = db.prepare('INSERT OR IGNORE INTO spaces (name, description) VALUES (?, ?)');
    const result = insert.run(name, description);
    
    if (result.changes === 0) {
      console.log(`Space "${name}" already exists`);
      const row = db.prepare('SELECT id FROM spaces WHERE name = ?').get(name);
      return { id: row.id, created: false };
    }
    
    console.log(`Created space: ${name}`);
    return { id: result.lastInsertRowid, created: true };
  } finally {
    db.close();
  }
}

export function addItem(name, spaceName, locationWithinSpace = '', description = '') {
  const db = getDb();
  try {
    // Find space
    const spaceRow = db.prepare('SELECT id FROM spaces WHERE name = ?').get(spaceName);
    if (!spaceRow) {
      console.error(`Space "${spaceName}" not found. Create it first with: add-space "${spaceName}"`);
      process.exit(1);
    }
    
    const insert = db.prepare(`
      INSERT INTO items (name, description, space_id, location_within_space)
      VALUES (?, ?, ?, ?)
    `);
    const result = insert.run(name, description, spaceRow.id, locationWithinSpace);
    
    console.log(`Added "${name}" to "${spaceName}"${locationWithinSpace ? ` (${locationWithinSpace})` : ''}`);
    return { id: result.lastInsertRowid };
  } finally {
    db.close();
  }
}

export function searchItems(query) {
  const db = getDb();
  try {
    // Use FTS5 for semantic-like search
    const stmt = db.prepare(`
      SELECT items.id, items.name, items.description, items.location_within_space,
             spaces.name as space_name
      FROM items_fts
      JOIN items ON items.rowid = items_fts.rowid
      JOIN spaces ON spaces.id = items.space_id
      WHERE items_fts MATCH ?
      ORDER BY rank
      LIMIT 20
    `);
    
    const results = stmt.all(query);
    
    if (results.length === 0) {
      console.log('No items found');
      return [];
    }
    
    console.log(`Found ${results.length} item(s):\n`);
    for (const r of results) {
      console.log(`  • ${r.name}`);
      console.log(`    Location: ${r.space_name}${r.location_within_space ? ` — ${r.location_within_space}` : ''}`);
      if (r.description) console.log(`    Note: ${r.description}`);
      console.log('');
    }
    
    return results;
  } finally {
    db.close();
  }
}

export function listSpaces() {
  const db = getDb();
  try {
    const stmt = db.prepare('SELECT name, description FROM spaces ORDER BY name');
    const spaces = stmt.all();
    
    if (spaces.length === 0) {
      console.log('No spaces defined yet');
      return [];
    }
    
    console.log(`${spaces.length} space(s):\n`);
    for (const s of spaces) {
      console.log(`  • ${s.name}${s.description ? ` — ${s.description}` : ''}`);
    }
    
    return spaces;
  } finally {
    db.close();
  }
}
