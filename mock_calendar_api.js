import express from 'express';
import cors from 'express';

const app = express();
const port = 5000;

// Enable CORS for all routes
app.use(cors());

// Add JSON parsing middleware
app.use(express.json());

// Mock response for GET /calendar/test
app.get('/calendar/test', (req, res) => {
  console.log('Mock calendar API test endpoint called');
  return res.json({
    items: [
      {
        id: 'mock-event-1',
        summary: 'Mock Yoga Session',
        start: { dateTime: '2025-05-06T08:00:00Z' },
        end: { dateTime: '2025-05-06T08:30:00Z' }
      },
      {
        id: 'mock-event-2',
        summary: 'Mock Meeting',
        start: { dateTime: '2025-05-06T10:00:00Z' },
        end: { dateTime: '2025-05-06T11:00:00Z' }
      }
    ]
  });
});

// Mock response for creating an event
app.post('/calendar/events', (req, res) => {
  console.log('Mock calendar event creation endpoint called');
  console.log('Event data:', req.body);
  
  // Return a successful response with mock event ID
  return res.json({
    id: 'mock-created-event-' + Date.now(),
    status: 'confirmed',
    htmlLink: 'https://calendar.google.com/mock-event',
    created: new Date().toISOString(),
    summary: req.body.summary || 'Untitled Event',
    start: req.body.start,
    end: req.body.end
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  return res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🧪 Mock Calendar API running at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  GET  /calendar/test');
  console.log('  POST /calendar/events');
  console.log('  GET  /health');
});