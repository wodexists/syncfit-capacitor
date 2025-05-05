
// calendarSyncMock.ts
export async function createEventOnGoogleCalendar(eventData: any) {
  // Simulate Google Calendar API call
  return {
    id: 'google_event_123',
    status: 'confirmed',
    ...eventData,
  };
}

export async function simulate409Error() {
  const error = new Error('Conflict: Slot already booked');
  // Mimic a Google Calendar 409 error
  (error as any).code = 409;
  throw error;
}

export async function simulateServerError() {
  const error = new Error('Server Error');
  (error as any).code = 500;
  throw error;
}
