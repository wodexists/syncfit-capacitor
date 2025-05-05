/**
 * SyncFit Learning Mode Manual Tests
 * 
 * Tests for the Learning Mode system that analyzes user workout patterns
 * to recommend optimal workout time slots.
 */

// Constants
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Test tracker
let passedTests = 0;
let failedTests = 0;
let totalTests = 0;

// Mock user preferences
class MockUserPreferences {
  private preferences: any;
  
  constructor(initialData: any = {}) {
    this.preferences = {
      learningEnabled: false,
      lastLearningChange: null,
      ...initialData
    };
  }
  
  get() {
    return {
      exists: true,
      data: () => this.preferences
    };
  }
  
  update(updateData: any) {
    this.preferences = { ...this.preferences, ...updateData };
    return Promise.resolve();
  }
  
  isLearningEnabled() {
    return this.preferences.learningEnabled;
  }
}

// Mock slot statistics
class MockSlotStats {
  private stats: any[];
  private userId: number;
  
  constructor(userId: number, initialStats: any[] = []) {
    this.userId = userId;
    this.stats = [...initialStats];
  }
  
  getAll() {
    return this.stats;
  }
  
  getById(slotId: string) {
    return this.stats.find(s => s.slotId === slotId);
  }
  
  create(stat: any) {
    const newStat = {
      id: this.stats.length + 1,
      userId: this.userId,
      ...stat
    };
    this.stats.push(newStat);
    return newStat;
  }
  
  update(slotId: string, updateData: any) {
    const index = this.stats.findIndex(s => s.slotId === slotId);
    if (index === -1) return null;
    
    this.stats[index] = { ...this.stats[index], ...updateData };
    return this.stats[index];
  }
}

// Simple assertion functions
function expectEqual(actual: any, expected: any, message: string) {
  totalTests++;
  
  let isEqual = false;
  
  if (typeof actual === 'object' && typeof expected === 'object') {
    // Compare objects
    isEqual = JSON.stringify(actual) === JSON.stringify(expected);
  } else {
    // Compare primitives
    isEqual = actual === expected;
  }
  
  if (isEqual) {
    console.log(`✅ PASSED: ${message}`);
    passedTests++;
  } else {
    console.log(`❌ FAILED: ${message}`);
    console.log(`   Expected: ${JSON.stringify(expected)}`);
    console.log(`   Actual:   ${JSON.stringify(actual)}`);
    failedTests++;
  }
}

function expectTrue(value: boolean, message: string) {
  expectEqual(value, true, message);
}

function expectFalse(value: boolean, message: string) {
  expectEqual(value, false, message);
}

// Test enabling/disabling learning mode
async function testLearningModeToggle() {
  console.log('\n===== Testing Learning Mode Toggle =====\n');
  
  const userPrefs = new MockUserPreferences({ learningEnabled: false });
  
  // Test initial state
  expectFalse(userPrefs.isLearningEnabled(), 
    'Learning mode should be disabled by default');
  
  // Enable learning mode
  await userPrefs.update({
    learningEnabled: true,
    lastLearningChange: new Date().toISOString()
  });
  
  expectTrue(userPrefs.isLearningEnabled(), 
    'Learning mode should be enabled after update');
  expectTrue(userPrefs.get().data().lastLearningChange !== null, 
    'Last learning change timestamp should be updated');
  
  // Disable learning mode
  await userPrefs.update({
    learningEnabled: false,
    lastLearningChange: new Date().toISOString()
  });
  
  expectFalse(userPrefs.isLearningEnabled(), 
    'Learning mode should be disabled after update');
}

// Test slot statistics recording
async function testSlotStatsRecording() {
  console.log('\n===== Testing Slot Statistics Recording =====\n');
  
  const userId = 123;
  const slotStats = new MockSlotStats(userId);
  const userPrefs = new MockUserPreferences({ learningEnabled: true });
  
  // Only record stats if learning mode is enabled
  if (userPrefs.isLearningEnabled()) {
    // Record a new slot stat
    const mondayMorningStat = slotStats.create({
      slotId: 'mon_08',
      dayOfWeek: 'monday',
      hour: 8,
      totalScheduled: 1,
      totalCompleted: 0,
      successRate: 0,
      lastUpdated: new Date().toISOString()
    });
    
    expectEqual(mondayMorningStat.slotId, 'mon_08', 
      'Slot stat should have correct slot ID');
    expectEqual(mondayMorningStat.totalScheduled, 1, 
      'New slot should have 1 scheduled workout');
    expectEqual(mondayMorningStat.successRate, 0, 
      'New slot should have 0 success rate initially');
    
    // Update the stat to mark workout as completed
    const updatedStat = slotStats.update('mon_08', {
      totalCompleted: 1,
      successRate: 1.0,
      lastUpdated: new Date().toISOString()
    });
    
    expectEqual(updatedStat?.totalCompleted, 1, 
      'Slot should record completed workout');
    expectEqual(updatedStat?.successRate, 1.0, 
      'Success rate should be updated correctly');
  } else {
    console.log('   ⚠️ Learning mode disabled, skipping stat recording');
  }
  
  // Create more slot stats for testing
  slotStats.create({
    slotId: 'wed_12',
    dayOfWeek: 'wednesday',
    hour: 12,
    totalScheduled: 5,
    totalCompleted: 4,
    successRate: 0.8,
    lastUpdated: new Date().toISOString()
  });
  
  slotStats.create({
    slotId: 'fri_18',
    dayOfWeek: 'friday',
    hour: 18,
    totalScheduled: 10,
    totalCompleted: 3,
    successRate: 0.3,
    lastUpdated: new Date().toISOString()
  });
  
  // Test retrieving all slot stats
  const allStats = slotStats.getAll();
  expectEqual(allStats.length, 3, 
    'Should have recorded all 3 slot stats');
}

// Test slot recommendation algorithm
async function testSlotRecommendations() {
  console.log('\n===== Testing Slot Recommendations =====\n');
  
  const userId = 123;
  
  // Create stats with varying success rates
  const slotStats = new MockSlotStats(userId, [
    {
      id: 1,
      userId,
      slotId: 'mon_08',
      dayOfWeek: 'monday',
      hour: 8,
      totalScheduled: 10,
      totalCompleted: 9,
      successRate: 0.9, // High success
      lastUpdated: new Date().toISOString()
    },
    {
      id: 2,
      userId,
      slotId: 'tue_12',
      dayOfWeek: 'tuesday',
      hour: 12,
      totalScheduled: 8,
      totalCompleted: 4,
      successRate: 0.5, // Medium success
      lastUpdated: new Date().toISOString()
    },
    {
      id: 3,
      userId,
      slotId: 'wed_18',
      dayOfWeek: 'wednesday',
      hour: 18,
      totalScheduled: 5,
      totalCompleted: 1,
      successRate: 0.2, // Low success
      lastUpdated: new Date().toISOString()
    },
    {
      id: 4,
      userId,
      slotId: 'thu_07',
      dayOfWeek: 'thursday',
      hour: 7,
      totalScheduled: 12,
      totalCompleted: 11,
      successRate: 0.92, // Highest success
      lastUpdated: new Date().toISOString()
    }
  ]);
  
  // Mock recommendation algorithm
  function getRecommendedSlots(threshold = 0.7) {
    const allStats = slotStats.getAll();
    return allStats
      .filter(stat => stat.successRate >= threshold)
      .sort((a, b) => b.successRate - a.successRate);
  }
  
  // Get recommendations
  const recommendedSlots = getRecommendedSlots();
  
  expectEqual(recommendedSlots.length, 2, 
    'Should recommend only slots with high success rates');
  
  expectEqual(recommendedSlots[0].slotId, 'thu_07', 
    'Highest success slot should be recommended first');
  
  expectTrue(recommendedSlots.every(slot => slot.successRate >= 0.7), 
    'All recommended slots should meet minimum success threshold');
  
  // Test recommendation scoring
  function scoreSlot(slot: any) {
    // Scale 0-1 success rate to 0-10 score - this is the main factor
    const baseScore = Math.round(slot.successRate * 10);
    
    // Add recency bonus - newer stats get slight preference
    const lastUpdated = new Date(slot.lastUpdated).getTime();
    const now = Date.now();
    const recencyBonus = lastUpdated > (now - ONE_WEEK_MS) ? 0.5 : 0;
    
    // Add consistency bonus - more data points = more reliable
    // But this should be a smaller factor than success rate
    const consistencyBonus = slot.totalScheduled > 5 ? 0.5 : 0;
    
    // Make sure highest success rate has highest overall score
    return baseScore + recencyBonus + consistencyBonus;
  }
  
  const scoredSlots = slotStats.getAll().map(slot => ({
    ...slot,
    score: scoreSlot(slot)
  }));
  
  expectTrue(scoredSlots.some(slot => slot.score > 0), 
    'Slots should receive scores based on success rate and other factors');
  
  const highestScoreSlot = scoredSlots.reduce(
    (highest, current) => current.score > highest.score ? current : highest,
    { score: 0 }
  );
  
  expectEqual(highestScoreSlot.slotId, 'thu_07', 
    'Highest success slot should receive highest score');
}

// Run all tests
async function runAllTests() {
  console.log('\n🔍 Starting SyncFit Learning Mode Tests\n');
  
  // Run individual test suites
  await testLearningModeToggle();
  await testSlotStatsRecording();
  await testSlotRecommendations();
  
  // Print summary
  console.log('\n===== Test Summary =====');
  console.log(`Total tests:  ${totalTests}`);
  console.log(`Passed:       ${passedTests}`);
  console.log(`Failed:       ${failedTests}`);
  
  const successRate = (passedTests / totalTests) * 100;
  console.log(`Success rate: ${successRate.toFixed(2)}%\n`);
  
  if (failedTests === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log(`❌ ${failedTests} tests failed.`);
  }
}

// Run the tests
runAllTests().catch(console.error);