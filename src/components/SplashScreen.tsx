import { useEffect, useState } from "react";

interface SplashScreenProps {
  isVisible: boolean;
}

export function SplashScreen({ isVisible }: SplashScreenProps) {
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    if (!isVisible) {
      // Wait for fade out animation before removing from DOM
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 500); // Match transition duration
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
    }
  }, [isVisible]);

  // PERFORMANCE: Don't render splash screen if not visible - avoid blocking render
  if (!shouldRender || !isVisible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-b from-[#50BAA8] to-[#50BAA8] transition-opacity duration-300"
      aria-hidden="true"
      role="presentation"
    >
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl animate-pulse"></div>
        
        {/* Logo with zoom animation */}
        <div className="relative animate-zoom-in-out">
          <img
            src="/nibbles.webp"
            alt="Nibbles Kitchen Logo"
            width="208"
            height="160"
            className="h-32 w-40 sm:h-40 sm:w-52 rounded-full object-cover shadow-2xl border-4 border-white/30"
            loading="eager"
            fetchPriority="high"
          />
        </div>
      </div>

      <style>{`
        @keyframes zoom-in-out {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
        
        .animate-zoom-in-out {
          animation: zoom-in-out 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

