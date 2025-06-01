import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSwipeable, SwipeEventData } from 'react-swipeable';
import OnboardingCard from './OnboardingCard';
import { APP_NAME } from '../constants'; // Assuming APP_NAME is in constants.ts
import ScrollingPosterColumn from './ScrollingPosterColumn'; // Import the component

const onboardingSteps = [
  {
    id: 1,
    title: "Track",
    subtitle: "Log every show or movie you've seen and keep a watchlist of what's next."
  },
  {
    id: 2,
    title: "Discover",
    subtitle: "Get personal recommendations based on your taste and mood."
  },
  {
    id: 3,
    title: "Rank",
    subtitle: "Sort what you've watched into ranked lists through comparisons."
  }
];

const OnboardingPage: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const navigate = useNavigate();

  const handleSwipedLeft = () => {
    console.log('Swiped Left');
    setCurrentScreen(prev => Math.min(prev + 1, onboardingSteps.length - 1));
  };

  const handleSwipedRight = () => {
    console.log('Swiped Right');
    setCurrentScreen(prev => Math.max(prev - 1, 0));
  };

  const handleSwiping = (eventData: SwipeEventData) => {
    console.log('Swiping...', eventData.dir);
  };

  const handlers = useSwipeable({
    onSwipedLeft: handleSwipedLeft,
    onSwipedRight: handleSwipedRight,
    onSwiping: handleSwiping,
    preventScrollOnSwipe: true,
    trackMouse: true
  });

  const handleGetStarted = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    navigate('/login'); // Or navigate to '/signup' or a pre-auth route if preferred
  };

  return (
    <div
      {...handlers}
      className="min-h-screen flex flex-col items-center justify-center bg-neutral-900 p-4 relative overflow-hidden select-none"
    >
      {/* Background Animation Columns - Apply blur to posters, remove backdrop-blur */}
      <div className="absolute inset-0 flex flex-row justify-center opacity-10 md:opacity-15 z-0 blur-lg">
        <ScrollingPosterColumn mediaType="movie" scrollDirection="down" animationSpeed={30} />
        <ScrollingPosterColumn mediaType="tv" scrollDirection="up" animationSpeed={40} />
        <ScrollingPosterColumn mediaType="movie" scrollDirection="down" animationSpeed={25} />
        <ScrollingPosterColumn mediaType="tv" scrollDirection="up" animationSpeed={35} />
      </div>

      {/* Ensure content is above the background */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10">
        <h1 className="text-xl font-medium uppercase tracking-widest text-slate-300">{APP_NAME || 'SEEN'}</h1>
      </div>

      <div
        {...handlers}
        className="flex-grow flex flex-col items-center justify-center w-full h-full cursor-grab z-10"
      >
        <div className="w-full max-w-xl flex items-center justify-center">
            <OnboardingCard
                title={onboardingSteps[currentScreen].title}
                subtitle={onboardingSteps[currentScreen].subtitle}
            />
        </div>
        <button
          onClick={handleGetStarted}
          className="bg-[#007C91] text-white font-semibold py-3 px-10 rounded-full shadow-lg hover:bg-[#005f70] transition-colors duration-300 w-full max-w-xs text-lg mt-8"
        >
          Get started
        </button>
        <button 
          onClick={() => navigate('/login')} 
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors mt-4"
        >
          Already have an account? Log in
        </button>
      </div>

      <div className="w-full flex flex-col items-center space-y-6 pb-4 z-10">
        <div className="flex space-x-2">
          {onboardingSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentScreen(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${currentScreen === index ? 'bg-[#007C91]' : 'bg-gray-500 hover:bg-gray-400'}`}
              aria-label={`Go to screen ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage; 