import React, { useState, useEffect } from 'react';

export default function CountUp({ target, duration = 2000, className = "" }) {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    const increment = target / (duration / 16); // 60fps
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCurrentValue(target);
        clearInterval(timer);
      } else {
        setCurrentValue(Math.floor(current));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target, duration]);

  return <span className={className}>{currentValue}</span>;
}