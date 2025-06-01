import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MediaItem, PersonCreditItem } from './types';
import { MediaCard } from './components'; // Assuming MediaCard is in components.tsx
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from './icons'; // Assuming you have these icons

interface MediaCarouselProps {
  title: string;
  items: MediaItem[];
  onItemClick?: (item: MediaItem | PersonCreditItem) => void; // Optional click handler
  onMarkAsSeenClick?: (item: MediaItem | PersonCreditItem) => void;
  onAddToWatchlistClick?: (item: MediaItem | PersonCreditItem) => void;
  isSeen?: (item: MediaItem | PersonCreditItem) => boolean;
  isWatchlisted?: (item: MediaItem | PersonCreditItem) => boolean;
}

const SWIPE_THRESHOLD = 50; // Minimum pixels for a swipe to be registered
const WHEEL_THRESHOLD = 30; // Threshold for wheel events
const SCROLL_DEBOUNCE_TIME = 200; // milliseconds to wait before allowing another scroll via wheel
const WHEEL_DEBOUNCE_TIME = 200; // milliseconds to wait before allowing another scroll via wheel

const MediaCarousel: React.FC<MediaCarouselProps> = ({ 
  title, 
  items, 
  onItemClick,
  onMarkAsSeenClick,
  onAddToWatchlistClick,
  isSeen,
  isWatchlisted
}) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Refs for swipe detection
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const isSwipingRef = useRef(false);
  const canScrollWithWheelRef = useRef(true); // Ref for wheel scroll debounce
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for the timeout
  const carouselRef = useRef<HTMLDivElement>(null); // Ref for the carousel div

  const handleDefaultItemClick = (item: MediaItem | PersonCreditItem) => {
    if (item.media_type) {
      navigate(`/media/${item.media_type}/${item.id}`);
    }
  };

  const clickHandler = onItemClick || handleDefaultItemClick;

  if (!items || items.length === 0) {
    return null; // Don't render anything if there are no items
  }

  const goToPrevious = useCallback(() => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? items.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  }, [currentIndex, items.length]);

  const goToNext = useCallback(() => {
    const isLastSlide = currentIndex === items.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  }, [currentIndex, items.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
    touchEndXRef.current = e.targetTouches[0].clientX; // Initialize endX
    isSwipingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isSwipingRef.current) {
      touchEndXRef.current = e.targetTouches[0].clientX;
    }
  };

  const handleTouchEnd = () => {
    if (isSwipingRef.current && touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const swipeDistance = touchStartXRef.current - touchEndXRef.current;
      if (Math.abs(swipeDistance) > SWIPE_THRESHOLD) {
        if (swipeDistance > 0) { // Swiped left
          goToNext();
        } else { // Swiped right
          goToPrevious();
        }
      }
    }
    // Reset swipe state
    isSwipingRef.current = false;
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  const handleWheel = useCallback((e: WheelEvent) => { // Changed e type to WheelEvent
    // Prioritize horizontal scrolling for the carousel
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > WHEEL_THRESHOLD / 2) {
      e.preventDefault(); // Prevent default page scroll if horizontal movement is dominant and significant
      
      if (canScrollWithWheelRef.current) {
        if (e.deltaX > WHEEL_THRESHOLD) { // Swiped/scrolled right
          goToNext();
          canScrollWithWheelRef.current = false;
        } else if (e.deltaX < -WHEEL_THRESHOLD) { // Swiped/scrolled left
          goToPrevious();
          canScrollWithWheelRef.current = false;
        }

        if (!canScrollWithWheelRef.current) {
          if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = setTimeout(() => {
            canScrollWithWheelRef.current = true;
          }, SCROLL_DEBOUNCE_TIME);
        }
      }
    } // If predominantly vertical scroll, or minor scroll, let the browser handle it (page scroll)
  }, [goToNext, goToPrevious]); // Added dependencies

  useEffect(() => {
    const carouselElement = carouselRef.current;
    if (carouselElement) {
      const wheelListener = (e: Event) => handleWheel(e as WheelEvent); // Cast to WheelEvent
      carouselElement.addEventListener('wheel', wheelListener, { passive: false });
      return () => {
        carouselElement.removeEventListener('wheel', wheelListener);
      };
    }
  }, [handleWheel]); // Add handleWheel to dependencies

  // Calculate the offset to center the current item
  // This assumes each item has roughly the same visible width on screen.
  // We will show 4 items now, making them smaller.
  const itemWidthPercentage = 100 / 4; // Each of 4 visible items takes up 1/4 of the container width

  return (
    <section className="mt-6 mb-8 w-full relative">
      <h2 className="text-2xl font-semibold text-neutral-100 mb-4 px-1 sm:px-0">{title}</h2>
      
      {/* Carousel Viewport - Increased to py-3 */}
      <div className="overflow-hidden relative py-3">
        {/* Item Container - This will slide */}
        <div 
          className="flex transition-transform duration-500 ease-in-out cursor-grab active:cursor-grabbing"
          style={{ 
            transform: `translateX(-${currentIndex * 224}px)`,
            touchAction: 'pan-y'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          // onWheel={handleWheel} <--- REMOVED THIS LINE
          ref={carouselRef} // Added ref here
        >
          {items.map((item) => (
            <div 
              key={`${item.id}-${item.media_type}`}
              className="flex-shrink-0 flex-grow-0 w-[224px] h-[336px] px-1 pb-2 select-none aspect-[2/3]"
            >
              <MediaCard 
                item={item} 
                onClick={() => clickHandler(item)}
                onMarkAsSeenClick={onMarkAsSeenClick ? () => onMarkAsSeenClick(item) : undefined}
                onAddToWatchlistClick={onAddToWatchlistClick ? () => onAddToWatchlistClick(item) : undefined}
                isSeen={isSeen ? isSeen(item) : undefined}
                isWatchlisted={isWatchlisted ? isWatchlisted(item) : undefined}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {items.length > 4 && (
        <>
          <button 
            onClick={goToPrevious} 
            className="absolute top-1/2 left-0 sm:-left-2 transform -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-2 rounded-full z-10 transition-opacity duration-300 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            aria-label="Previous Item"
            // style={{ marginTop: '-0.5rem' }} // Removed marginTop for now
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <button 
            onClick={goToNext} 
            className="absolute top-1/2 right-0 sm:-right-2 transform -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-2 rounded-full z-10 transition-opacity duration-300 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            aria-label="Next Item"
            // style={{ marginTop: '-0.5rem' }} // Removed marginTop for now
          >
            <ChevronRightIcon className="w-6 h-6" />
          </button>
        </>
      )}
    </section>
  );
};

export default MediaCarousel; 