import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Intuition, Tag } from '@monorepo/shared-types';

const app = express();
const PORT = 3003;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
const intuitions: Map<string, Intuition> = new Map();
const tags: Tag[] = [
  { id: '1', name: 'business', color: '#4F46E5' },
  { id: '2', name: 'personal', color: '#059669' },
  { id: '3', name: 'finance', color: '#DC2626' },
  { id: '4', name: 'technology', color: '#7C3AED' },
  { id: '5', name: 'health', color: '#EA580C' },
  { id: '6', name: 'education', color: '#0891B2' },
];

// Seed some initial data
const seedIntuitions: Intuition[] = [
  {
    id: uuidv4(),
    title: 'Remote Work Revolution',
    content: 'The shift to remote work will fundamentally change urban development patterns. Expect to see declining commercial real estate values in city centers and growth in suburban and rural areas with good internet connectivity.',
    tags: ['business', 'technology'],
    confidence: 85,
    timeframe: '2-5 years',
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date('2024-01-15').toISOString(),
  },
  {
    id: uuidv4(),
    title: 'AI in Healthcare',
    content: 'AI-powered diagnostic tools will become standard in primary care within the next decade. This will dramatically improve early detection rates for various conditions and reduce healthcare costs.',
    tags: ['health', 'technology'],
    confidence: 75,
    timeframe: '5-10 years',
    createdAt: new Date('2024-01-20').toISOString(),
    updatedAt: new Date('2024-01-20').toISOString(),
  },
  {
    id: uuidv4(),
    title: 'Sustainable Finance Growth',
    content: 'ESG investing will move from niche to mainstream. Traditional investment strategies that ignore sustainability factors will underperform.',
    tags: ['finance', 'business'],
    confidence: 90,
    timeframe: '1-3 years',
    createdAt: new Date('2024-01-22').toISOString(),
    updatedAt: new Date('2024-01-22').toISOString(),
  },
];

// Initialize with seed data
seedIntuitions.forEach(intuition => {
  intuitions.set(intuition.id, intuition);
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all tags
app.get('/api/tags', (_req, res) => {
  res.json(tags);
});

// Get all intuitions with filtering
app.get('/api/intuitions', (req, res) => {
  const { search, tags: tagFilter, minConfidence } = req.query;
  
  let results = Array.from(intuitions.values());
  
  // Apply search filter
  if (search && typeof search === 'string') {
    const searchLower = search.toLowerCase();
    results = results.filter(intuition => 
      intuition.title.toLowerCase().includes(searchLower) ||
      intuition.content.toLowerCase().includes(searchLower)
    );
  }
  
  // Apply tag filter
  if (tagFilter && typeof tagFilter === 'string') {
    const filterTags = tagFilter.split(',');
    results = results.filter(intuition =>
      filterTags.some(tag => intuition.tags.includes(tag))
    );
  }
  
  // Apply confidence filter
  if (minConfidence && typeof minConfidence === 'string') {
    const minConf = parseInt(minConfidence, 10);
    if (!isNaN(minConf)) {
      results = results.filter(intuition => intuition.confidence >= minConf);
    }
  }
  
  // Sort by date (newest first)
  results.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  res.json(results);
});

// Create new intuition
app.post('/api/intuitions', (req, res) => {
  const { title, content, tags, confidence, timeframe } = req.body;
  
  if (!title || !content || !tags || confidence === undefined || !timeframe) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const newIntuition: Intuition = {
    id: uuidv4(),
    title,
    content,
    tags,
    confidence,
    timeframe,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  intuitions.set(newIntuition.id, newIntuition);
  return res.status(201).json(newIntuition);
});

// Get single intuition
app.get('/api/intuitions/:id', (req, res) => {
  const intuition = intuitions.get(req.params.id);
  
  if (!intuition) {
    return res.status(404).json({ error: 'Intuition not found' });
  }
  
  return res.json(intuition);
});

// Update intuition
app.put('/api/intuitions/:id', (req, res) => {
  const intuition = intuitions.get(req.params.id);
  
  if (!intuition) {
    return res.status(404).json({ error: 'Intuition not found' });
  }
  
  const { title, content, tags, confidence, timeframe } = req.body;
  
  const updatedIntuition: Intuition = {
    ...intuition,
    title: title || intuition.title,
    content: content || intuition.content,
    tags: tags || intuition.tags,
    confidence: confidence !== undefined ? confidence : intuition.confidence,
    timeframe: timeframe || intuition.timeframe,
    updatedAt: new Date().toISOString(),
  };
  
  intuitions.set(req.params.id, updatedIntuition);
  return res.json(updatedIntuition);
});

// Delete intuition
app.delete('/api/intuitions/:id', (req, res) => {
  const intuition = intuitions.get(req.params.id);
  
  if (!intuition) {
    return res.status(404).json({ error: 'Intuition not found' });
  }
  
  intuitions.delete(req.params.id);
  return res.status(204).send();
});

// Start server
app.listen(PORT, () => {
  console.log(`Intuitions API server running on http://localhost:${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});