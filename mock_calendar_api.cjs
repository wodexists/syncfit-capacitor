/**
 * SyncFit Mock Calendar API
 * 
 * This simple Express server mocks the Google Calendar API for testing purposes.
 * It provides endpoints that emulate responses similar to Google Calendar.
 */

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5050; // Changed to avoid conflict with main app port

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Storage for mock calendar data
const mockCalendars = [
  {
    id: 'primary',
    summary: 'Test User Calendar',
    timeZone: 'America/Los_Angeles',
    primary: true
  },
  {
    id: 'fitness-calendar',
    summary: 'Fitness',
    timeZone: 'America/Los_Angeles',
    primary: false
  }
];

const mockEvents = [];

// GET /calendar/test - Test endpoint
app.get('/calendar/test', (req, res) => {
  console.log('Mock Calendar API test endpoint accessed');
  res.json({ 
    status: 'success', 
    message: 'Mock Calendar API is working',
    timestamp: new Date().toISOString()
  });
});

// For server-side endpoint integration testing
app.get('/api/calendar/test', (req, res) => {
  console.log('Server Mock Calendar API test endpoint accessed');
  res.json({ 
    status: 'success', 
    message: 'Server Mock Calendar API is working',
    timestamp: new Date().toISOString()
  });
});

// GET /calendars - List available calendars
app.get('/calendars', (req, res) => {
  res.json({
    kind: 'calendar#calendarList',
    items: mockCalendars
  });
});

// GET /calendars/:calendarId/events - List events for a calendar
app.get('/calendars/:calendarId/events', (req, res) => {
  const { calendarId } = req.params;
  const { timeMin, timeMax, maxResults } = req.query;
  
  console.log(`Fetching events for calendar: ${calendarId}`);
  console.log(`Time range: ${timeMin} to ${timeMax}`);
  
  // Filter events for this calendar and time range
  const filteredEvents = mockEvents.filter(event => 
    event.calendarId === calendarId && 
    (!timeMin || new Date(event.start.dateTime) >= new Date(timeMin)) &&
    (!timeMax || new Date(event.end.dateTime) <= new Date(timeMax))
  );
  
  // Limit results if needed
  const limitedEvents = maxResults ? 
    filteredEvents.slice(0, parseInt(maxResults)) : 
    filteredEvents;
  
  res.json({
    kind: 'calendar#events',
    summary: calendarId,
    items: limitedEvents
  });
});

// POST /calendars/:calendarId/events - Create a new event
app.post('/calendars/:calendarId/events', (req, res) => {
  const { calendarId } = req.params;
  const eventData = req.body;
  
  console.log(`Creating event in calendar: ${calendarId}`);
  console.log('Event data:', eventData);
  
  // Generate new unique ID
  const eventId = `mock-event-${Date.now()}`;
  
  // Create the event
  const newEvent = {
    id: eventId,
    calendarId,
    ...eventData,
    status: 'confirmed',
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  
  mockEvents.push(newEvent);
  
  res.status(201).json(newEvent);
});

// PUT /calendars/:calendarId/events/:eventId - Update an event
app.put('/calendars/:calendarId/events/:eventId', (req, res) => {
  const { calendarId, eventId } = req.params;
  const eventData = req.body;
  
  console.log(`Updating event ${eventId} in calendar: ${calendarId}`);
  
  // Find event index
  const eventIndex = mockEvents.findIndex(e => 
    e.id === eventId && e.calendarId === calendarId
  );
  
  if (eventIndex === -1) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  // Update the event
  mockEvents[eventIndex] = {
    ...mockEvents[eventIndex],
    ...eventData,
    updated: new Date().toISOString()
  };
  
  res.json(mockEvents[eventIndex]);
});

// DELETE /calendars/:calendarId/events/:eventId - Delete an event
app.delete('/calendars/:calendarId/events/:eventId', (req, res) => {
  const { calendarId, eventId } = req.params;
  
  console.log(`Deleting event ${eventId} from calendar: ${calendarId}`);
  
  // Find event index
  const eventIndex = mockEvents.findIndex(e => 
    e.id === eventId && e.calendarId === calendarId
  );
  
  if (eventIndex === -1) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  // Remove the event
  mockEvents.splice(eventIndex, 1);
  
  res.status(204).send();
});

// POST /conflict-simulation - Simulate a 409 conflict error
app.post('/conflict-simulation', (req, res) => {
  console.log('Simulating 409 conflict error');
  
  res.status(409).json({
    error: {
      code: 409,
      message: 'The requested identifier already exists',
      errors: [
        {
          domain: 'global',
          reason: 'duplicate',
          message: 'The requested identifier already exists'
        }
      ]
    }
  });
});

// POST /server-error-simulation - Simulate a 500 server error
app.post('/server-error-simulation', (req, res) => {
  console.log('Simulating 500 server error');
  
  res.status(500).json({
    error: {
      code: 500,
      message: 'Internal server error',
      errors: [
        {
          domain: 'global',
          reason: 'backendError',
          message: 'Internal server error'
        }
      ]
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🧪 Mock Calendar API running at http://localhost:${PORT}`);
});