const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.get('/api/pokemon', (req, res) => {
  const { type, search } = req.query;
  res.json(db.getAll({ type, search }));
});

app.get('/api/types', (req, res) => {
  res.json(db.getTypes());
});

app.get('/api/pokemon/:id', (req, res) => {
  const card = db.getById(req.params.id);
  if (!card) return res.status(404).json({ error: 'Pokemon not found' });
  res.json(card);
});

app.post('/api/pokemon', (req, res) => {
  const { name, type, hp, moves } = req.body;
  if (!name || !type || !hp || !moves) {
    return res.status(400).json({ error: 'Missing required fields: name, type, hp, moves' });
  }
  const card = db.add({ name, type, hp, moves });
  res.status(201).json(card);
});

app.delete('/api/pokemon/:id', (req, res) => {
  const deleted = db.remove(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Pokemon not found' });
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`Pokemon Cards server running at http://localhost:${PORT}`);
});
