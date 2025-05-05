import { getDoc, getDocs, setDoc, updateDoc, doc, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { dateToSlotId } from './intelligentScheduling';

/**
 * Interface for slot statistics stored in Firebase
 */
export interface FirebaseSlotStat {
  slotId: string;
  totalScheduled: number;
  totalCancelled: number;
  successRate: number;
  lastUsed: Timestamp | null;
}

/**
 * Get user's learning mode preference from Firestore
 * @param userId The user's Firebase UID
 * @returns Whether learning mode is enabled
 */
export async function getLearningModeEnabled(userId: string): Promise<boolean> {
  try {
    const prefsRef = doc(db, `users/${userId}/preferences/learningMode`);
    const docSnap = await getDoc(prefsRef);
    
    if (docSnap.exists()) {
      return docSnap.data().enabled === true;
    }
    
    // Default to enabled if no preference exists
    return true;
  } catch (error) {
    console.error('Error getting learning mode preferences:', error);
    return true; // Default to enabled if there's an error
  }
}

/**
 * Toggle the learning mode preference in Firestore
 * @param userId The user's Firebase UID
 * @param enabled Whether learning mode should be enabled
 */
export async function setLearningModeEnabled(userId: string, enabled: boolean): Promise<void> {
  try {
    const prefsRef = doc(db, `users/${userId}/preferences/learningMode`);
    const now = new Date();
    
    await setDoc(prefsRef, {
      enabled,
      lastChanged: Timestamp.fromDate(now)
    });
    
    console.log(`Learning mode ${enabled ? 'enabled' : 'disabled'} for user ${userId}`);
  } catch (error) {
    console.error('Error setting learning mode preferences:', error);
    throw error;
  }
}

/**
 * Get all slot statistics for a user from Firestore
 * @param userId The user's Firebase UID
 * @returns Record of slot statistics by slot ID
 */
export async function getSlotStats(userId: string): Promise<Record<string, FirebaseSlotStat>> {
  try {
    const slotStatsRef = collection(db, `users/${userId}/slotStats`);
    const querySnapshot = await getDocs(slotStatsRef);
    const slotStats: Record<string, FirebaseSlotStat> = {};
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as FirebaseSlotStat;
      slotStats[data.slotId] = data;
    });
    
    return slotStats;
  } catch (error) {
    console.error('Error getting slot stats:', error);
    return {};
  }
}

/**
 * Update slot statistics for a scheduled workout
 * @param userId The user's Firebase UID
 * @param date The date of the scheduled workout
 */
export async function trackScheduledWorkout(userId: string, date: Date): Promise<void> {
  // First check if learning mode is enabled
  const learningEnabled = await getLearningModeEnabled(userId);
  if (!learningEnabled) {
    console.log('Learning mode disabled, not tracking scheduled workout');
    return;
  }
  
  const slotId = dateToSlotId(date);
  
  try {
    const slotStatRef = doc(db, `users/${userId}/slotStats/${slotId}`);
    const docSnap = await getDoc(slotStatRef);
    
    if (docSnap.exists()) {
      // Update existing stat
      const data = docSnap.data() as FirebaseSlotStat;
      const totalScheduled = (data.totalScheduled || 0) + 1;
      
      // Calculate new success rate
      const successRate = calculateSuccessRate(
        totalScheduled,
        data.totalCancelled || 0
      );
      
      await updateDoc(slotStatRef, {
        totalScheduled,
        successRate,
        lastUsed: Timestamp.fromDate(new Date())
      });
    } else {
      // Create new stat
      await setDoc(slotStatRef, {
        slotId,
        totalScheduled: 1,
        totalCancelled: 0,
        successRate: 100, // 100% success rate initially
        lastUsed: Timestamp.fromDate(new Date())
      });
    }
    
    console.log(`Tracked scheduled workout for slot ${slotId}`);
  } catch (error) {
    console.error('Error tracking scheduled workout:', error);
  }
}

/**
 * Update slot statistics for a cancelled workout
 * @param userId The user's Firebase UID
 * @param date The date of the cancelled workout
 */
export async function trackCancelledWorkout(userId: string, date: Date): Promise<void> {
  // First check if learning mode is enabled
  const learningEnabled = await getLearningModeEnabled(userId);
  if (!learningEnabled) {
    console.log('Learning mode disabled, not tracking cancelled workout');
    return;
  }
  
  const slotId = dateToSlotId(date);
  
  try {
    const slotStatRef = doc(db, `users/${userId}/slotStats/${slotId}`);
    const docSnap = await getDoc(slotStatRef);
    
    if (docSnap.exists()) {
      // Update existing stat
      const data = docSnap.data() as FirebaseSlotStat;
      const totalCancelled = (data.totalCancelled || 0) + 1;
      
      // Calculate new success rate
      const successRate = calculateSuccessRate(
        data.totalScheduled || 0,
        totalCancelled
      );
      
      await updateDoc(slotStatRef, {
        totalCancelled,
        successRate,
        lastUsed: Timestamp.fromDate(new Date())
      });
      
      console.log(`Tracked cancelled workout for slot ${slotId}`);
    }
    // If no stat exists, there's nothing to update
  } catch (error) {
    console.error('Error tracking cancelled workout:', error);
  }
}

/**
 * Calculate success rate as a percentage
 * @param scheduled Total scheduled workouts
 * @param cancelled Total cancelled workouts
 * @returns Success rate as 0-100 percentage
 */
function calculateSuccessRate(scheduled: number, cancelled: number): number {
  if (scheduled === 0) return 0;
  
  const completed = scheduled - cancelled;
  const rate = (completed / scheduled) * 100;
  return Math.round(rate);
}