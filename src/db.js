const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.BINLID_DB || path.join(__dirname, '..', 'binlid.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'schema.sql');

let db = null;

function getDB() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH);
    
    // Ensure schema exists
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema);
  }
  
  // Promisify methods
  return {
    all: (sql, params = []) => new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),
    get: (sql, params = []) => new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    }),
    run: (sql, params = []) => new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    }),
    close: () => {
      if (db) {
        db.close();
        db = null;
      }
    }
  };
}

module.exports = { getDB };
