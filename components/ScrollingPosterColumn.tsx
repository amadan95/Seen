import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MediaItem } from '../types';
import { tmdbService } from '../services';
import { PosterImage } from '../components';

interface ScrollingPosterColumnProps {
  mediaType: 'movie' | 'tv';
  scrollDirection: 'up' | 'down';
  itemsPerColumn?: number;
  animationSpeed?: number;
}

const DEFAULT_ITEMS_PER_COLUMN = 20;
const DEFAULT_ANIMATION_SPEED = 50;

const ScrollingPosterColumn: React.FC<ScrollingPosterColumnProps> = ({
  mediaType,
  scrollDirection,
  itemsPerColumn = DEFAULT_ITEMS_PER_COLUMN,
  animationSpeed = DEFAULT_ANIMATION_SPEED,
}) => {
  const [posters, setPosters] = useState<MediaItem[]>([]);
  const translateY = useRef(0);
  const animationFrameId = useRef<number | null>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastTimestamp = useRef<number>(0);

  useEffect(() => {
    const fetchPosters = async () => {
      try {
        let fetchedMedia;
        if (mediaType === 'movie') {
          fetchedMedia = await tmdbService.getPopularMovies(1);
        } else {
          fetchedMedia = await tmdbService.getPopularShows(1);
        }
        if (fetchedMedia && fetchedMedia.results) {
          const validPosters = fetchedMedia.results.filter(item => item.poster_path);
          setPosters(validPosters);
        }
      } catch (error) {
        console.error(`Error fetching ${mediaType}s:`, error);
      }
    };
    fetchPosters();
  }, [mediaType, scrollDirection]);

  const animateScroll = useCallback((timestamp: number) => {
    if (!contentRef.current || !columnRef.current || posters.length === 0) {
      animationFrameId.current = requestAnimationFrame(animateScroll);
      return;
    }

    if (lastTimestamp.current === 0) {
      lastTimestamp.current = timestamp;
      animationFrameId.current = requestAnimationFrame(animateScroll);
      return;
    }

    const deltaTime = (timestamp - lastTimestamp.current) / 1000;
    lastTimestamp.current = timestamp;

    const singleListHeight = contentRef.current.scrollHeight / 2;

    if (singleListHeight === 0) {
      animationFrameId.current = requestAnimationFrame(animateScroll);
      return;
    }
    
    const movement = animationSpeed * deltaTime;

    if (scrollDirection === 'up') {
      translateY.current -= movement;
      if (translateY.current <= -singleListHeight) {
        translateY.current += singleListHeight;
      }
    } else {
      translateY.current += movement;
      if (translateY.current >= 0) {
        translateY.current -= singleListHeight;
      }
    }
    
    if (contentRef.current) {
      contentRef.current.style.transform = `translateY(${translateY.current}px)`;
    }
    animationFrameId.current = requestAnimationFrame(animateScroll);

  }, [animationSpeed, scrollDirection, posters.length]);

  useEffect(() => {
    if (scrollDirection === 'down' && contentRef.current && posters.length > 0) {
        const singleListHeight = contentRef.current.scrollHeight / 2;
        if (singleListHeight > 0) {
            translateY.current = -singleListHeight;
            contentRef.current.style.transform = `translateY(${translateY.current}px)`;
        }
    } else if (scrollDirection === 'up' && contentRef.current) {
        translateY.current = 0;
        if (posters.length > 0) {
            contentRef.current.style.transform = `translateY(0px)`;
        }
    }

    lastTimestamp.current = 0;
    animationFrameId.current = requestAnimationFrame(animateScroll);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [animateScroll, scrollDirection, posters]);

  if (posters.length === 0) {
    return <div className="flex-1 h-full bg-neutral-800/50 animate-pulse" />;
  }

  const duplicatedPosters = [...posters, ...posters];

  return (
    <div ref={columnRef} className="flex-1 h-full overflow-hidden relative min-w-0">
      <div ref={contentRef} className="flex flex-col w-full">
        {duplicatedPosters.map((item, index) => (
          <div key={`${item.id}-${mediaType}-${scrollDirection}-${index}`} className="w-full p-1 md:p-2">
            <PosterImage
              path={item.poster_path}
              alt={item.title || item.name || 'Poster'}
              className="w-full h-auto object-cover rounded-md shadow-lg"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScrollingPosterColumn;