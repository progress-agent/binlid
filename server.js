const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDB } = require('./src/db');

const app = express();
const PORT = process.env.PORT || 3456;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Get all spaces
app.get('/api/spaces', async (req, res) => {
  try {
    const db = await getDB();
    const spaces = await db.all('SELECT * FROM spaces ORDER BY name');
    res.json(spaces);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create space
app.post('/api/spaces', async (req, res) => {
  try {
    const db = await getDB();
    const { name, description } = req.body;
    const result = await db.run(
      'INSERT INTO spaces (name, description) VALUES (?, ?)',
      [name, description]
    );
    res.json({ id: result.lastID, name, description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get items (optionally filtered by space)
app.get('/api/items', async (req, res) => {
  try {
    const db = await getDB();
    const { space_id, q } = req.query;
    
    let sql = `
      SELECT items.*, spaces.name as space_name 
      FROM items 
      JOIN spaces ON items.space_id = spaces.id
    `;
    const params = [];
    
    if (space_id) {
      sql += ' WHERE items.space_id = ?';
      params.push(space_id);
    }
    
    if (q) {
      sql += space_id ? ' AND' : ' WHERE';
      sql += ' items.id IN (SELECT rowid FROM items_fts WHERE items_fts MATCH ?)';
      params.push(q);
    }
    
    sql += ' ORDER BY items.updated_at DESC';
    
    const items = await db.all(sql, params);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create item
app.post('/api/items', async (req, res) => {
  try {
    const db = await getDB();
    const { name, description, space_id, location_within_space } = req.body;
    const result = await db.run(
      'INSERT INTO items (name, description, space_id, location_within_space) VALUES (?, ?, ?, ?)',
      [name, description, space_id, location_within_space]
    );
    res.json({ id: result.lastID, name, description, space_id, location_within_space });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Move item
app.post('/api/items/:id/move', async (req, res) => {
  try {
    const db = await getDB();
    const { to_space_id, note } = req.body;
    const itemId = req.params.id;
    
    // Get current space
    const item = await db.get('SELECT space_id FROM items WHERE id = ?', [itemId]);
    if (!item) throw new Error('Item not found');
    
    // Record move
    await db.run(
      'INSERT INTO moves (item_id, from_space_id, to_space_id, note) VALUES (?, ?, ?, ?)',
      [itemId, item.space_id, to_space_id, note]
    );
    
    // Update item
    await db.run(
      'UPDATE items SET space_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [to_space_id, itemId]
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search items
app.get('/api/search', async (req, res) => {
  try {
    const db = await getDB();
    const { q } = req.query;
    
    const items = await db.all(`
      SELECT items.*, spaces.name as space_name 
      FROM items 
      JOIN spaces ON items.space_id = spaces.id
      WHERE items.id IN (SELECT rowid FROM items_fts WHERE items_fts MATCH ?)
      ORDER BY items.updated_at DESC
    `, [q]);
    
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`BinLid server running on http://localhost:${PORT}`);
});
