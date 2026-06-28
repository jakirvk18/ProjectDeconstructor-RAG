import React from "react";

const FloatingStars = () => {
  const stars = Array.from({ length: 120 });

  return (
    <div className="fixed inset-0 overflow-hidden -z-10 bg-[#020617]">
      {stars.map((_, i) => {
        const size = Math.random() * 3 + 1;
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const duration = Math.random() * 6 + 6;
        const delay = Math.random() * 6;

        return (
          <span
            key={i}
            className="absolute rounded-full bg-white animate-star"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              left: `${left}%`,
              top: `${top}%`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              opacity: Math.random() * 0.8 + 0.2,
              boxShadow: `0 0 ${size * 4}px rgba(255,255,255,0.8)`,
            }}
          />
        );
      })}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black opacity-70" />
    </div>
  );
};

export default FloatingStars;