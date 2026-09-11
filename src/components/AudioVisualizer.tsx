import React, { useEffect, useState } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  barCount?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive, barCount = 12 }) => {
  const [heights, setHeights] = useState<number[]>(new Array(barCount).fill(15));

  useEffect(() => {
    if (!isActive) {
      setHeights(new Array(barCount).fill(15));
      return;
    }

    const interval = setInterval(() => {
      setHeights(prev =>
        prev.map(() => Math.floor(Math.random() * 75) + 20)
      );
    }, 120);

    return () => clearInterval(interval);
  }, [isActive, barCount]);

  return (
    <div className="flex items-center gap-1 h-8 px-2">
      {heights.map((height, i) => (
        <span
          key={i}
          className="w-1 rounded-full transition-all duration-150 ease-out"
          style={{
            height: `${isActive ? height : 12}%`,
            background: isActive
              ? `linear-gradient(to top, #4f46e5, #06b6d4)`
              : '#334155',
            opacity: isActive ? 0.9 : 0.4,
          }}
        />
      ))}
    </div>
  );
};
