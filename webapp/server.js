import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { setupIndexRoutes } from './routes/index.js';
import { setupCreateRoutes } from './routes/create.js';
import { setupDictationRoutes } from './routes/dictation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve static audio files from dictations directory
app.use('/dictations', express.static(path.join(__dirname, 'dictations')));

// Simple template rendering function
function render(templateName, data = {}) {
  const layoutPath = path.join(__dirname, 'views', 'layout.html');
  const contentPath = path.join(__dirname, 'views', templateName);

  let layout = fs.readFileSync(layoutPath, 'utf-8');
  let content = fs.readFileSync(contentPath, 'utf-8');

  // Replace placeholders in content
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(regex, value);
  }

  // Insert content into layout
  layout = layout.replace('{{content}}', content);

  return layout;
}

// Setup routes
setupIndexRoutes(app, render);
setupCreateRoutes(app, render);
setupDictationRoutes(app, render);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).send('Er is iets misgegaan. Probeer het opnieuw.');
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Pagina niet gevonden');
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🎙️  Dictee app running on http://localhost:${PORT}`);
  console.log(`\nMake sure you have created a .env file with:`);
  console.log(`- ANTHROPIC_API_KEY`);
  console.log(`- ELEVENLABS_API_KEY`);
  console.log(`- ELEVENLABS_VOICE_ID\n`);
});
