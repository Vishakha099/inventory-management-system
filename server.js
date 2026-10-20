require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(express.static('public')); // serves public/index.html

const Item = mongoose.model('Item', new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  sku:      { type: String, required: true, unique: true, trim: true },
  category: { type: String, trim: true, default: '' },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  reorderAt:{ type: Number, min: 0, default: 5 },
  price:    { type: Number, min: 0, default: 0 }
}, { timestamps: true }));

const wrap = fn => (req, res) => fn(req, res).catch(err => {
  if (err.code === 11000) return res.status(409).json({ error: 'SKU already exists' });
  if (err.name === 'ValidationError' || err.name === 'CastError')
    return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// Create
app.post('/api/items', wrap(async (req, res) => {
  res.status(201).json(await Item.create(req.body));
}));

// Read (all, newest first)
app.get('/api/items', wrap(async (req, res) => {
  res.json(await Item.find().sort({ createdAt: -1 }));
}));

// Update
app.put('/api/items/:id', wrap(async (req, res) => {
  const item = await Item.findByIdAndUpdate(req.params.id, req.body,
    { new: true, runValidators: true });
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
}));

// Delete
app.delete('/api/items/:id', wrap(async (req, res) => {
  const item = await Item.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.status(204).end();
}));

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventory')
  .then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Running at http://localhost:${port}`));
  })
  .catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
