import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

interface SuccessConfettiProps {
  visible: boolean;
  message?: string;
  duration?: number;
  onComplete?: () => void;
}

export default function SuccessConfetti({ 
  visible, 
  message = "Workout scheduled! You're making space for yourself.", 
  duration = 2000, 
  onComplete 
}: SuccessConfettiProps) {
  const [isVisible, setIsVisible] = useState(visible);
  
  useEffect(() => {
    setIsVisible(visible);
    
    if (visible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onComplete) onComplete();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onComplete]);
  
  const generateConfetti = () => {
    // Generate 30 confetti pieces
    const confetti = [];
    const colors = ['#FF5252', '#FFD740', '#64FFDA', '#448AFF', '#B388FF', '#FFAB40'];
    
    for (let i = 0; i < 30; i++) {
      const size = Math.random() * 8 + 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const xRandom = (Math.random() - 0.5) * 100; // Random X position
      const yRandom = Math.random() * -100; // Start above the container
      const rotation = Math.random() * 360;
      
      confetti.push(
        <motion.div
          key={i}
          className="absolute rounded-sm"
          style={{
            width: size,
            height: size,
            backgroundColor: color,
            top: '50%',
            left: '50%',
            originX: 0.5,
            originY: 0.5,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: xRandom,
            y: [yRandom, 100 + Math.random() * 100], // Float down
            opacity: [1, 1, 0],
            rotate: rotation + 360,
          }}
          transition={{
            duration: 1 + Math.random() * 1,
            ease: "easeOut",
          }}
        />
      );
    }
    
    return confetti;
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative flex items-center justify-center">
            {/* Confetti elements */}
            {generateConfetti()}
            
            {/* Success message */}
            <motion.div
              className="bg-white shadow-lg rounded-md px-6 py-4 max-w-md mx-auto z-10 flex items-center gap-3 border border-green-100"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 15 }}
            >
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-gray-700">{message}</p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}