import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './server/routes/auth.ts';
import dashboardRoutes from './server/routes/dashboard.ts';
import membersRoutes from './server/routes/members.ts';
import tasksRoutes from './server/routes/tasks.ts';
import reassignRoutes from './server/routes/reassign.ts';
import resourcesRoutes from './server/routes/resources.ts';
import calendarRoutes from './server/routes/calendar.ts';
import analyticsRoutes from './server/routes/analytics.ts';
import notificationsRoutes from './server/routes/notifications.ts';
import settingsRoutes from './server/routes/settings.ts';
import demoRoutes from './server/routes/demo.ts';
import { startBackgroundJobs } from './server/services/backgroundJobs.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Note: Real-time events are now handled via Supabase Realtime in the frontend

// API Routes
app.use('/api', authRoutes); // login, register, join, forgot-password, me
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/tasks', tasksRoutes);

// Direct task workflow endpoints required by specification:
app.post('/api/assign', (req, res, next) => {
  req.url = '/assign';
  tasksRoutes(req, res, next);
});
app.post('/api/accept', (req, res, next) => {
  req.url = '/accept';
  tasksRoutes(req, res, next);
});
app.post('/api/reject', (req, res, next) => {
  req.url = '/reject';
  tasksRoutes(req, res, next);
});
app.post('/api/complete', (req, res, next) => {
  req.url = '/complete';
  tasksRoutes(req, res, next);
});
app.use('/api/reassign', reassignRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/demo', demoRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'House Hub API', timestamp: new Date().toISOString() });
});

// Start background cron jobs (overdue checker & deadline reminders every 60s)
startBackgroundJobs();

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  🏠 House Hub server running [${isProduction ? 'PROD' : 'DEV'}]`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://localhost:${PORT}/\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
