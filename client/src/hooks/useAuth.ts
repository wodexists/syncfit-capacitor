import { useContext } from 'react';
import { AuthContext } from '../App';
import { apiRequest, queryClient } from '@/lib/queryClient';

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  // Add logout functionality
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Invalidate auth data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      // Force a reload to clear any cached state
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  return {
    ...context,
    logout
  };
}