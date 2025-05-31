import React, { useState } from 'react';

interface TopCategoryNavProps {
  onCategorySelect: (category: string) => void;
  initialCategory?: string;
}

const CATEGORIES = ["Trending", "Recommendations", "Movies", "TV shows"]; // Updated categories

const TopCategoryNav: React.FC<TopCategoryNavProps> = ({ onCategorySelect, initialCategory }) => {
  const [activeCategory, setActiveCategory] = useState(initialCategory || CATEGORIES[0]);

  const handleSelect = (category: string) => {
    setActiveCategory(category);
    onCategorySelect(category);
  };

  return (
    <nav className="bg-[#111111] sticky top-0 z-30 shadow-md"> {/* Matches body bg, adjust if different shade desired */}
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex space-x-3 sm:space-x-4 overflow-x-auto py-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => handleSelect(category)}
              className={`whitespace-nowrap py-2 px-3 sm:px-3.5 rounded-md text-sm font-medium transition-colors duration-150
                ${activeCategory === category
                  ? 'bg-gray-700 text-[#F6F6F6]' // Active state: dark gray background, light text
                  : 'text-gray-400 hover:text-[#F6F6F6] hover:bg-gray-800' // Inactive: lighter gray text, hover effect
                }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default TopCategoryNav; 