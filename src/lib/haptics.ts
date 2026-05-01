
export const hapticFeedback = (pattern: number | number[] = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore vibration errors
    }
  }
};

export const softHaptic = () => hapticFeedback(5);
export const mediumHaptic = () => hapticFeedback(15);
export const errorHaptic = () => hapticFeedback([10, 50, 10]);
export const successHaptic = () => hapticFeedback([5, 30, 5]);
