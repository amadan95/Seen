import React from 'react';

interface OnboardingCardProps {
  title: string;
  subtitle: string;
  // screenId is not directly used here but could be for future conditional rendering within the card
}

const OnboardingCard: React.FC<OnboardingCardProps> = ({ title, subtitle }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full px-6">
      <h2
        className="text-5xl md:text-6xl font-bold mb-4 text-white"
        style={{ fontFamily: 'Georgia, serif' }} // Using Georgia as a placeholder for a bold serif
      >
        {title}
      </h2>
      <p
        className="text-lg md:text-xl text-slate-300 max-w-md"
        style={{ fontFamily: 'Inter, sans-serif' }} // Using Inter as a placeholder for a neutral sans-serif
      >
        {subtitle}
      </p>
    </div>
  );
};

export default OnboardingCard; 