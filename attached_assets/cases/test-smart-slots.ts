import { initAuth, signInWithGoogle } from '../mocks/auth-mock';
import { syncCalendars, getAvailableTimeSlots } from '../mocks/calendar-mock';
import { updateUserPreferences } from '../mocks/preferences-mock';

export async function runSmartSlotTest() {
  console.log('\nRunning Smart Slot Test...');
  try {
    // Initialize authentication system
    await initAuth();
    const user = await signInWithGoogle({ email: 'test@example.com', name: 'Test User' });
    console.log('✓ Test user signed in');
    
    // Initialize calendar sync
    await syncCalendars(user.uid);
    console.log('✓ Calendar synced');
    
    // Set up user preferences for optimal smart scheduling
    await updateUserPreferences(user.uid, {
      preferredWorkoutDuration: 30,
      preferredDaysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      preferredTimeWindows: [
        { start: '06:00', end: '10:00' }, // Morning 6AM-10AM
        { start: '17:00', end: '21:00' }  // Evening 5PM-9PM
      ],
      smartSchedulingEnabled: true
    });
    console.log('✓ User preferences set for optimal smart scheduling');
    
    // Get available time slots without learning mode
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7); // One week from now
    
    const regularSlots = await getAvailableTimeSlots(user.uid, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      duration: 30,
      useLearningMode: false
    });
    
    if (!regularSlots || regularSlots.length === 0) {
      throw new Error('No regular time slots found');
    }
    console.log(`✓ Found ${regularSlots.length} regular time slots`);
    
    // Get available time slots with learning mode
    const smartSlots = await getAvailableTimeSlots(user.uid, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      duration: 30,
      useLearningMode: true
    });
    
    if (!smartSlots || smartSlots.length === 0) {
      throw new Error('No smart time slots found');
    }
    console.log(`✓ Found ${smartSlots.length} smart time slots`);
    
    // Check that some slots are recommended
    const recommendedSlots = smartSlots.filter(slot => slot.isRecommended);
    
    if (recommendedSlots.length === 0) {
      throw new Error('No recommended slots found in smart scheduling');
    }
    console.log(`✓ Found ${recommendedSlots.length} recommended time slots`);
    
    // Check that recommended slots have higher scores
    const recommendedScores = recommendedSlots.map(slot => slot.score);
    const nonRecommendedScores = smartSlots
      .filter(slot => !slot.isRecommended)
      .map(slot => slot.score);
    
    const avgRecommendedScore = recommendedScores.reduce((sum, score) => sum + (score || 0), 0) / recommendedScores.length;
    const avgNonRecommendedScore = nonRecommendedScores.reduce((sum, score) => sum + (score || 0), 0) / nonRecommendedScores.length;
    
    if (avgRecommendedScore <= avgNonRecommendedScore) {
      throw new Error('Recommended slots do not have higher average scores');
    }
    
    console.log(`✓ Recommended slots have higher average scores (${avgRecommendedScore.toFixed(2)} vs ${avgNonRecommendedScore.toFixed(2)})`);
    
    return { name: 'Smart Slot Test', success: true };
  } catch (error) {
    console.error('Smart Slot Test Failed:', error);
    return { name: 'Smart Slot Test', success: false, error };
  }
}