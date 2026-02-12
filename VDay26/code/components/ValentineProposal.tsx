
import React, { useState } from 'react';

// Confetti global from script tag
declare const confetti: any;

const GIFS = {
  START: "./editinggifs/outputs/baby_monkey_GIF.gif",   // The initial cute gif
  SAD_1: "./editinggifs/outputs/shakeHead.gif",    // After the 1st "No"
  SAD_2: "./editinggifs/outputs/tsIsValid.gif",    // After the 2nd "No"
  SAD_3: "./editinggifs/outputs/please.gif",    // After the 3rd "No"
  SAD_MAX: "./editinggifs/outputs/catEyes.gif",  // After the 4th "No"
  SUCCESS: "./editinggifs/outputs/yes.gif"    // When she clicks "Yes"
};

const REJECTION_PHRASES = [
  "No",
  "Are you sure?",
  "Stop the monkey business!",
  "Ts pmo",
  "Last chance :("
];

export const ValentineProposal: React.FC = () => {
  const [noCount, setNoCount] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [currentGif, setCurrentGif] = useState(GIFS.START);

  const handleNoClick = () => {
    const nextCount = Math.min(noCount + 1, 4);
    setNoCount(nextCount);
    
    // Change GIF based on count to show increasing sadness
    if (nextCount === 1) setCurrentGif(GIFS.SAD_1);
    else if (nextCount === 2) setCurrentGif(GIFS.SAD_2);
    else if (nextCount === 3) setCurrentGif(GIFS.SAD_3);
    else if (nextCount === 4) setCurrentGif(GIFS.SAD_MAX);
  };

  const handleYesClick = () => {
    setAccepted(true);
    setCurrentGif(GIFS.SUCCESS);
    
    // Confetti burst
    const end = Date.now() + (5 * 1000);
    const colors = ['#ff0000', '#ff69b4', '#ffffff', '#ff1493'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  // Button sizing logic
  // Yes button grows significantly (scaling from 1 to ~4.2 rem)
  const yesFontSize = 1 + noCount * 0.8; 
  // No button shrinks but stays readable until it vanishes
  const noFontSize = Math.max(0.5, 1 - noCount * 0.15);

  if (accepted) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-rose-50 p-6 text-center animate-in fade-in zoom-in duration-700">
        <div className="relative mb-8">
            <img 
                src={currentGif} 
                alt="Celebration" 
                className="rounded-3xl shadow-[0_20px_50px_rgba(225,29,72,0.3)] border-8 border-white w-72 md:w-[500px]" 
            />
            <div className="absolute -top-6 -right-6 text-7xl animate-bounce">💖</div>
            <div className="absolute -bottom-6 -left-6 text-7xl animate-bounce delay-150">💘</div>
        </div>
        <h1 className="font-love text-5xl md:text-8xl text-rose-600 mb-6 drop-shadow-md animate-pulse">
            Yay!!! I love you! ❤️
        </h1>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-rose-50 p-6 overflow-hidden transition-all duration-700">
            <div className="mb-12 flex flex-col items-center max-w-2xl">
        <div className="relative group">
            <img 
              src={currentGif} 
              alt="Valentine Proposal" 
              className="rounded-full shadow-2xl border-4 border-white w-72 h-72 md:w-[420px] md:h-[420px] object-cover transition-all duration-500 hover:scale-105" 
              onError={(e) => { e.currentTarget.src = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHpueWp3bmh4ZzV5ZzN5ZzZ5ZzZ5ZzZ5ZzZ5ZzZ5ZzZ5JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/MDJ9IbM3vUzp0pM4WJ/giphy.gif" }}
            />
        </div>
        <h1 className="font-love text-4xl md:text-6xl text-rose-500 mt-12 text-center leading-tight drop-shadow-sm animate-heartbeat">
          Will you be my valentine?
        </h1>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16 w-full px-4 min-h-[150px]">
        {/* Yes Button */}
        <button
          onClick={handleYesClick}
          style={{ fontSize: `${yesFontSize}rem` }}
          className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 px-12 rounded-full shadow-[0_10px_20px_rgba(225,29,72,0.4)] transition-all duration-300 active:scale-90 whitespace-nowrap z-20"
        >
          Yes
        </button>

        {/* No Button - Only shows if clicked fewer than 4 times */}
        {noCount < 4 && (
          <button
            onClick={handleNoClick}
            style={{ fontSize: `${noFontSize}rem` }}
            className="bg-zinc-400 hover:bg-zinc-500 text-white font-bold py-2 px-8 rounded-full shadow-md transition-all duration-300 active:scale-95 opacity-90 whitespace-nowrap"
          >
            {REJECTION_PHRASES[noCount]}
          </button>
        )}
      </div>

      {/* Decorative floating elements */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute text-rose-200/40 select-none animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              fontSize: `${Math.random() * 3 + 1}rem`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          >
            {i % 3 === 0 ? '❤' : i % 3 === 1 ? '💌' : '🎈'}
          </div>
        ))}
      </div>
    </div>
  );
};
