import React, { useState, useEffect, useCallback, useRef } from 'react';
// Fix: Add CrewMember, FeedItem, FeedActivityType to types import
import { MediaItem, Reaction, RatedItem, TMDBGenre, CastMember, CrewMember, Episode, RankedItem, ComparisonStep, WatchProviderDetails, WatchProviderCountryResult, TMDBMovie, TMDBShow, CustomList, CustomListMediaItem, UserProfile, FeedComment, PersonCreditItem, FeedItem, FeedActivityType } from './types';
import { REACTION_EMOJIS, REACTION_LABELS, TMDB_IMAGE_BASE_URL_W500, TMDB_IMAGE_BASE_URL_ORIGINAL, ACCENT_COLOR_CLASS_TEXT, ACCENT_COLOR_CLASS_BG, ACCENT_COLOR_CLASS_BG_HOVER, ACCENT_COLOR_CLASS_BORDER, ACCENT_COLOR_CLASS_RING } from './constants';
// Fix: Add ListBulletIcon to icons import
import { XMarkIcon, EyeIcon, StarIcon, CheckIcon, QuestionMarkCircleIcon, UserIcon, ChevronDoubleRightIcon, ChevronDoubleLeftIcon, ChatBubbleLeftEllipsisIcon, InformationCircleIcon, ArrowUpIcon, ArrowDownIcon, HeartIcon, ChatBubbleOvalLeftEllipsisIcon, PlusCircleIcon, PencilIcon, TrashIcon, FilmIcon, TvIcon, RectangleStackIcon, ListBulletIcon, BookmarkIcon, BookmarkSquareIcon, CheckCircleIcon, SparklesIcon } from './icons'; // Added BookmarkIcon, BookmarkSquareIcon, CheckCircleIcon, SparklesIcon
import { tmdbService, geminiService, userListService } from './services';
import { eventService } from './eventService';
import { Link } from 'react-router-dom'; // For navigation

// --- Skeleton Loader ---
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
}
export const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'rect', width, height }) => {
  const baseStyle = `animate-pulse bg-gray-800`;
  let variantStyle = '';
  switch(variant) {
    case 'text': variantStyle = `h-4 my-1 rounded-md`; break;
    case 'circle': variantStyle = `rounded-full`; break;
    case 'rect': default: variantStyle = `rounded-lg`; break;
  }
  const style = { width: width, height: height };
  return <div className={`${baseStyle} ${variantStyle} ${className}`} style={style}></div>;
};

// --- Poster Image with Skeleton ---
interface PosterImageProps {
  path: string | null;
  alt: string;
  className?: string;
  iconType?: 'media' | 'person';
  size?: 'w500' | 'original';
}
export const PosterImage: React.FC<PosterImageProps> = ({ path, alt, className, iconType = 'media', size = 'w500' }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const baseUrl = size === 'w500' ? TMDB_IMAGE_BASE_URL_W500 : TMDB_IMAGE_BASE_URL_ORIGINAL;
  const imageUrl = path ? `${baseUrl}${path}` : null;

  useEffect(() => {
    setLoaded(false); setError(false);
    if (!imageUrl) { setError(true); setLoaded(true); return; }
    const img = new Image(); img.src = imageUrl;
    img.onload = () => setLoaded(true);
    img.onerror = () => { setError(true); setLoaded(true); };
    return () => { img.onload = null; img.onerror = null; };
  }, [imageUrl]);

  if (!loaded) return <Skeleton className={className || 'w-full h-full'} />;
  if (error || !imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-brand-surface text-gray-500 rounded-lg ${className || 'w-full h-full'}`}>
        {iconType === 'person' ? <UserIcon className="w-1/2 h-1/2" /> : <QuestionMarkCircleIcon className="w-1/2 h-1/2" />}
      </div>
    );
  }

  const incomingClassName = className || '';
  
  // Check if specific width or height classes are provided by the caller
  const hasSpecificWidth = /\bw-(auto|px|screen|svw|lvw|\d+(\/\d+)?|\d+rem|\d+em|\d+%|\[.+\])\b/.test(incomingClassName);
  const hasSpecificHeight = /\bh-(auto|px|screen|svh|lvh|\d+(\/\d+)?|\d+rem|\d+em|\d+%|\[.+\])\b/.test(incomingClassName);

  const baseStyling = ['object-cover']; // Default object-fit

  if (!hasSpecificWidth) {
    baseStyling.push('w-full');
  }
  if (!hasSpecificHeight) {
    baseStyling.push('h-full');
  }
  
  // Add default rounding if not specified in incomingClassName by a rounded-* class.
  if (!/\brounded-\S+\b/.test(incomingClassName)) {
    baseStyling.push('rounded-lg');
  }

  // Clean incomingClassName: remove classes controlled by PosterImage if no specific dimensions were passed.
  // Keep other utility classes (e.g., margins, specific rounding if present, etc.).
  let additionalUserClasses = incomingClassName
    .replace(/\bobject-(cover|contain|fill|none|scale-down)\b/g, ''); // Remove any object-fit

  if (!hasSpecificWidth) {
    additionalUserClasses = additionalUserClasses.replace(/\bw-(auto|px|screen|svw|lvw|\d+(\/\d+)?|\d+rem|\d+em|\d+%|\[.+\])\b/g, '');
  }
  if (!hasSpecificHeight) {
    additionalUserClasses = additionalUserClasses.replace(/\bh-(auto|px|screen|svh|lvh|\d+(\/\d+)?|\d+rem|\d+em|\d+%|\[.+\])\b/g, '');
  }
  
  additionalUserClasses = additionalUserClasses.replace(/\s+/g, ' ').trim();


  const finalImgClassName = [
    ...baseStyling,
    additionalUserClasses,
    'transition-opacity duration-500 ease-in-out',
    (loaded && !error) ? 'opacity-100' : 'opacity-0'
  ].filter(Boolean).join(' ');
  
  return <img 
    src={imageUrl} 
    alt={alt} 
    className={finalImgClassName} 
  />;
};

// --- Media Card ---
interface MediaCardProps {
  item: MediaItem | PersonCreditItem;
  onClick?: (item: MediaItem | PersonCreditItem) => void;
  className?: string;
  context?: 'default' | 'personCredits';
  onMarkAsSeenClick?: (item: MediaItem | PersonCreditItem) => void;
  onAddToWatchlistClick?: (item: MediaItem | PersonCreditItem) => void;
  isSeen?: boolean;
  isWatchlisted?: boolean;
  onReRankClick?: (item: MediaItem | PersonCreditItem) => void;
}
export const MediaCard: React.FC<MediaCardProps> = ({ 
  item, 
  onClick, 
  className = '', 
  context = 'default',
  onMarkAsSeenClick,
  onAddToWatchlistClick,
  isSeen,
  isWatchlisted,
  onReRankClick
}) => {
  const title = item.title || item.name || 'Untitled';
  const releaseYear = item.release_date?.substring(0,4) || item.first_air_date?.substring(0,4) || '';
  const recScore = (item as MediaItem).recScore;

  const handleSeenClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent card click when clicking icon
    onMarkAsSeenClick?.(item);
  };

  const handleWatchlistClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent card click when clicking icon
    onAddToWatchlistClick?.(item);
  };

  return (
    <div 
      className={`bg-brand-surface rounded-lg shadow-lg overflow-hidden group transform hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 cursor-pointer ${className}`}
      onClick={() => onClick?.(item)}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(item);}}
    >
      <div className="relative aspect-[2/3]">
        <PosterImage path={item.poster_path} alt={title} className="w-full h-full object-cover" />
        
        {/* Action icons - always visible, top right, vertical stack */}
        {context === 'default' && onMarkAsSeenClick && onAddToWatchlistClick && (
          <div className="absolute top-1.5 right-1.5 flex flex-col space-y-1.5 z-10"> {/* Adjusted positioning and layout */}
            <button 
              onClick={handleSeenClick}
              className={`p-1.5 rounded-full transition-colors transform hover:scale-110 ${isSeen ? 'bg-green-500/90 hover:bg-green-400/95' : 'bg-gray-800/80 hover:bg-gray-700/90 backdrop-blur-sm'}`}
              aria-label={isSeen ? "Marked as Seen" : "Mark as Seen"}
              title={isSeen ? "Marked as Seen" : "Mark as Seen"}
            >
              {isSeen ? <CheckCircleIcon className="w-5 h-5 text-white" /> : <PlusCircleIcon className="w-5 h-5 text-white" />}
            </button>
            {isSeen && onReRankClick && (
              <button
                onClick={(e) => { e.stopPropagation(); onReRankClick(item); }}
                className={`p-1.5 rounded-full bg-sky-600/80 hover:bg-sky-500/90 backdrop-blur-sm transition-colors transform hover:scale-110`}
                aria-label="Re-Rank this item"
                title="Re-Rank this item"
              >
                <SparklesIcon className="w-5 h-5 text-white" />
              </button>
            )}
            <button 
              onClick={handleWatchlistClick}
              className={`p-1.5 rounded-full transition-colors transform hover:scale-110 ${isWatchlisted ? 'bg-brand-primary/90 hover:bg-brand-primary/100' : 'bg-gray-800/80 hover:bg-gray-700/90 backdrop-blur-sm'}`}
              aria-label={isWatchlisted ? "On Watchlist" : "Add to Watchlist"}
              title={isWatchlisted ? "On Watchlist" : "Add to Watchlist"}
            >
              {isWatchlisted ? <BookmarkSquareIcon className="w-5 h-5 text-white" /> : <BookmarkIcon className="w-5 h-5 text-white" />}
            </button>
          </div>
        )}

        {typeof recScore === 'number' && context !== 'personCredits' && (
          <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-1.5 py-0.5 rounded-md flex items-center">
            {/* If action icons are present, adjust recScore position, otherwise keep it top-right */}
            {/* This might need adjustment based on final icon placement. For now, it will overlay icons if they are also top-right */}
            <StarIcon className="w-3 h-3 text-brand-primary mr-0.5" />
            {recScore.toFixed(1)} Rec
          </div>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="font-bold text-sm text-brand-text-primary truncate transition-colors group-hover:text-brand-primary">{title}</h3>
        <p className="text-xs text-brand-text-secondary">{releaseYear}</p>
        {context === 'personCredits' && 'character' in item && (
          <p className="text-xs text-brand-text-secondary italic truncate">as {item.character}</p>
        )}
      </div>
    </div>
  );
};

// --- Rated Media Card (for lists) ---
interface RatedMediaCardProps {
  item: RankedItem | RatedItem;
  onClick?: (item: RankedItem | RatedItem) => void;
}
export const RatedMediaCard: React.FC<RatedMediaCardProps> = ({ item, onClick }) => {
  const title = item.title || item.name || 'Untitled';
  const releaseYear = item.release_date?.substring(0,4) || item.first_air_date?.substring(0,4) || '';

  // Use personalScore directly, ensure it's a number, default to 0 if not.
  const displayScore = 'personalScore' in item && typeof item.personalScore === 'number' ? item.personalScore : null;

  return (
    <div 
      className="bg-brand-surface rounded-lg shadow-md overflow-hidden group flex items-center space-x-4 p-3 transition-all duration-200 hover:bg-gray-800 cursor-pointer"
      onClick={() => onClick?.(item)}
    >
      <div className="w-16 flex-shrink-0">
        <PosterImage path={item.poster_path} alt={title || 'Media poster'} className="w-16 h-24 object-cover rounded" />
      </div>
      <div className="flex-grow overflow-hidden">
        <h3 className="font-bold text-md text-brand-text-primary truncate">{title}</h3>
        <p className="text-sm text-brand-text-secondary">{releaseYear}</p>
        <div className="flex items-center mt-2">
          <span className="text-2xl mr-2">{REACTION_EMOJIS[item.userReaction]}</span>
          <span className="text-sm font-semibold text-brand-text-primary">{REACTION_LABELS[item.userReaction]}</span>
        </div>
      </div>
      {displayScore !== null && (
        <div className="flex flex-col items-center justify-center px-4">
          <span className="text-2xl font-bold text-brand-primary">{displayScore.toFixed(1)}</span>
          <span className="text-xs text-brand-text-secondary">Score</span>
        </div>
      )}
    </div>
  );
};

// --- Reaction Picker ---
interface ReactionPickerProps { onSelectReaction: (reaction: Reaction) => void; }
export const ReactionPicker: React.FC<ReactionPickerProps> = ({ onSelectReaction }) => (
  <div className="flex justify-around items-center bg-brand-surface p-4 rounded-xl">
    {Object.values(Reaction).map(reaction => (
      <button 
        key={reaction} 
        onClick={() => onSelectReaction(reaction)} 
        className="flex flex-col items-center space-y-2 text-brand-text-secondary hover:text-brand-text-primary transition-transform duration-200 hover:scale-110"
        title={REACTION_LABELS[reaction]}
      >
        <span className="text-4xl">{REACTION_EMOJIS[reaction]}</span>
        <span className="text-xs font-semibold uppercase">{REACTION_LABELS[reaction]}</span>
      </button>
    ))}
  </div>
);

// --- Notes Textarea ---
interface NotesTextareaProps { value: string; onChange: (value: string) => void; placeholder?: string; }
export const NotesTextarea: React.FC<NotesTextareaProps> = ({ value, onChange, placeholder = "Add your personal notes or review..." }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full h-24 p-3 bg-brand-surface border border-gray-700 rounded-lg text-brand-text-primary placeholder-gray-500 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
  />
);

// --- Pairwise Comparison Modal ---
interface PairwiseComparisonModalProps { 
  isOpen: boolean; 
  onClose: () => void; 
  itemA: MediaItem; 
  itemB: MediaItem; 
  comparisonPrompt: string; 
  onChoose: (chosenItem: MediaItem) => void; 
  onTooTough?: () => void;
}

export const PairwiseComparisonModal: React.FC<PairwiseComparisonModalProps> = ({ 
  isOpen, 
  onClose, 
  itemA, 
  itemB, 
  comparisonPrompt, 
  onChoose,
  onTooTough
}) => {
  if (!isOpen || !itemA || !itemB) return null;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" title="">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-brand-text-primary mb-2">Which do you prefer?</h2>
        <p className="text-md text-brand-text-secondary mb-6">{comparisonPrompt}</p>
        <div className="flex justify-center items-stretch gap-4">
          {[itemA, itemB].map((item, index) => (
            <div key={item.id} className="w-1/2 cursor-pointer" onClick={() => onChoose(item)}>
              <div className="bg-brand-surface p-3 rounded-lg h-full flex flex-col justify-between hover:ring-2 hover:ring-brand-primary transition-all">
                <PosterImage path={item.poster_path} alt={item.title || item.name || ''} className="w-full aspect-[2/3] object-cover rounded-md mb-3" />
                <h3 className="font-bold text-brand-text-primary truncate">{item.title || item.name}</h3>
                <p className="text-sm text-brand-text-secondary">{item.release_date?.substring(0,4) || item.first_air_date?.substring(0,4)}</p>
              </div>
            </div>
          ))}
        </div>
        {onTooTough && (
          <button 
            onClick={onTooTough} 
            className="mt-6 text-sm text-brand-text-secondary hover:text-brand-primary underline"
          >
            This is too tough, I like them equally!
          </button>
        )}
      </div>
    </Modal>
  );
};

// --- Search Bar ---
interface SearchBarProps { onSearch: (query: string) => void; placeholder?: string; initialQuery?: string; }
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): Promise<ReturnType<F>> => new Promise(resolve => { if (timeout) clearTimeout(timeout); timeout = setTimeout(() => resolve(func(...args)), waitFor); });
};
export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, placeholder = "Search movies & TV shows...", initialQuery = "" }) => {
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<MediaItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useCallback(debounce(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    try {
      const data = await tmdbService.searchMedia(query, 1);
      const validSuggestions = data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv').slice(0, 5);
      setSuggestions(validSuggestions); setShowSuggestions(validSuggestions.length > 0);
    } catch (error) { console.error("Failed to fetch search suggestions:", error); setSuggestions([]); setShowSuggestions(false); }
  }, 500), []);

  useEffect(() => {
    if (localQuery.length > 2) {
      setShowSuggestions(true);
      debouncedSearch(localQuery);
    } else {
      setShowSuggestions(false);
    }
  }, [localQuery, debouncedSearch]);
  
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  const handleClickOutside = (event: MouseEvent) => { if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) setShowSuggestions(false); };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setLocalQuery(e.target.value);
  const handleSuggestionClick = (suggestion: MediaItem) => {
    setLocalQuery(suggestion.title || suggestion.name || '');
    setShowSuggestions(false);
    onSearch(suggestion.title || suggestion.name || '');
  };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setShowSuggestions(false); onSearch(localQuery.trim()); };

  return (
    <div ref={searchContainerRef} className="relative w-full max-w-lg mx-auto">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={localQuery}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full px-4 py-2 text-brand-text-primary bg-brand-surface border-2 border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors"
        />
      </form>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-2 bg-brand-surface border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          {suggestions.map(item => (
            <li 
              key={item.id}
              onClick={() => handleSuggestionClick(item)}
              className="px-4 py-3 cursor-pointer hover:bg-brand-primary"
            >
              <span className="font-medium text-brand-text-primary">{item.title || item.name}</span>
              <span className="text-sm text-brand-text-secondary ml-2">({item.release_date?.substring(0,4) || item.first_air_date?.substring(0,4)})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// --- Modal Component ---
interface ModalProps { isOpen: boolean; onClose: () => void; title?: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'; }
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl', '3xl': 'max-w-3xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className={`bg-brand-surface text-brand-text-primary rounded-xl shadow-2xl w-full ${sizeClasses[size]} p-6 m-4 transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-scale-in`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-3 border-b border-gray-700">
          <h2 className="text-xl font-bold text-brand-text-primary">{title}</h2>
          <button onClick={onClose} className="text-brand-text-secondary hover:text-white transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="mt-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Cast Card ---
interface CastCardProps { member: CastMember; onClick: (personId: number) => void; }
export const CastCard: React.FC<CastCardProps> = ({ member, onClick }) => (
  <div className="flex flex-col items-center text-center cursor-pointer group" onClick={() => onClick(member.id)}>
    <div className="w-24 h-24 mb-2 rounded-full overflow-hidden border-2 border-transparent group-hover:border-brand-primary transition-all duration-200">
      <PosterImage path={member.profile_path} alt={member.name} className="w-full h-full object-cover" iconType='person'/>
    </div>
    <p className="font-bold text-sm text-brand-text-primary">{member.name}</p>
    <p className="text-xs text-brand-text-secondary">{member.character}</p>
  </div>
);

// --- Crew Member Display (for MediaDetailPage) ---
interface CrewMemberDisplayProps { member: CrewMember; onClick: (personId: number) => void; }
export const CrewMemberDisplay: React.FC<CrewMemberDisplayProps> = ({member, onClick}) => (
  <div 
    className="bg-brand-surface p-2 rounded-lg flex items-center space-x-3 cursor-pointer hover:bg-gray-800"
    onClick={() => onClick(member.id)}
  >
    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
      <PosterImage path={member.profile_path} alt={member.name} iconType='person' className="w-full h-full object-cover"/>
    </div>
    <div>
      <p className="font-semibold text-sm text-brand-text-primary">{member.name}</p>
      <p className="text-xs text-brand-text-secondary">{member.job}</p>
    </div>
  </div>
);

// --- Episode Card ---
interface EpisodeCardProps { episode: Episode; showStill?: boolean; }
export const EpisodeCard: React.FC<EpisodeCardProps> = ({ episode, showStill = true }) => (
  <div className="bg-brand-surface rounded-lg overflow-hidden flex space-x-4 p-3 items-start">
    {showStill && (
      <div className="w-32 h-20 flex-shrink-0">
        <PosterImage path={episode.still_path} alt={`Still from ${episode.name}`} className="w-full h-full object-cover rounded-md" />
      </div>
    )}
    <div className="flex-grow">
      <h4 className="font-bold text-brand-text-primary">{episode.episode_number}. {episode.name}</h4>
      <p className="text-sm text-brand-text-secondary mt-1 line-clamp-2">{episode.overview}</p>
    </div>
  </div>
);

// --- Comparison Summary Modal ---
interface ComparisonSummaryModalProps { isOpen: boolean; onClose: () => void; rankedItem: RankedItem | null; comparisonHistory: ComparisonStep[]; totalComparisonsMade: number; }
export const ComparisonSummaryModal: React.FC<ComparisonSummaryModalProps> = ({ isOpen, onClose, rankedItem, comparisonHistory, totalComparisonsMade }) => {
  if (!isOpen || !rankedItem) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Ranking Complete!">
      <div className="p-4 text-center">
        <h3 className="text-2xl font-bold text-brand-primary mb-2">New Rank for {rankedItem.title || rankedItem.name}!</h3>
        <p className="text-lg text-brand-text-primary">
          After {totalComparisonsMade} comparison{totalComparisonsMade === 1 ? '' : 's'}, it's ranked <span className="font-bold">#{rankedItem.rank + 1}</span> in its category.
        </p>
        <div className="my-6 w-full bg-brand-surface p-4 rounded-lg">
            <h4 className="font-bold text-lg text-brand-text-primary border-b border-gray-700 pb-2 mb-3">Comparison Details:</h4>
            <ul className="space-y-2 text-left">
                {comparisonHistory.map((step, index) => (
                    <li key={index} className="text-sm flex justify-between items-center p-2 rounded-md bg-gray-800">
                        <span className="text-brand-text-secondary">
                          Compared with <span className='font-semibold text-brand-text-primary'>{step.itemComparedAgainst.title || step.itemComparedAgainst.name}</span>
                        </span>
                        <span className={`font-bold px-2 py-1 rounded-md text-xs ${step.userPreferredNewItem ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                            {step.userPreferredNewItem ? 'PREFERRED' : 'LOST'}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2 px-4 bg-brand-primary text-white font-bold rounded-lg hover:bg-opacity-80 transition-all"
        >
          Awesome!
        </button>
      </div>
    </Modal>
  );
};

// --- Watch Provider Display ---
interface WatchProviderDisplayProps { providers: WatchProviderCountryResult | undefined; itemTitle: string; }
export const WatchProviderDisplay: React.FC<WatchProviderDisplayProps> = ({ providers, itemTitle }) => {
  if (!providers || Object.keys(providers).length === 0) {
    return (
      <div className="p-4 bg-brand-surface rounded-lg mt-4">
        <p className="text-brand-text-secondary">No streaming information available for your region.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-brand-surface rounded-lg mt-4">
      <h3 className="font-bold text-lg text-brand-text-primary mb-3">Where to Watch</h3>
      {Object.entries(providers).map(([country, data]) => (
        <div key={country}>
          <a href={data.link} target="_blank" rel="noopener noreferrer" className="text-brand-text-secondary hover:text-brand-primary text-sm mb-3 block">
            Watch options for {itemTitle} in your region
          </a>
          {['flatrate', 'rent', 'buy'].map(type => {
            const providerList = data[type as keyof WatchProviderDetails];
            if (!providerList || providerList.length === 0) return null;
            return (
              <div key={type} className="mb-2">
                <h4 className="font-semibold text-brand-text-primary capitalize text-md mb-1">{type === 'flatrate' ? 'Stream' : type}</h4>
                <div className="flex flex-wrap gap-2">
                  {providerList.map((p: WatchProviderDetails) => (
                    <img key={p.provider_id} src={`${TMDB_IMAGE_BASE_URL_W500}${p.logo_path}`} alt={p.provider_name} title={p.provider_name} className="w-10 h-10 rounded-md" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// --- Custom List Item Card ---
interface CustomListItemCardProps {
  item: CustomListMediaItem;
  listId: string;
  index: number;
  totalItems: number;
  onClick: (item: CustomListMediaItem) => void;
  onRemove: (listId: string, itemId: number, itemType: 'movie'|'tv') => void;
  onReorder: (listId: string, itemIndex: number, direction: 'up' | 'down') => void;
}
export const CustomListItemCard: React.FC<CustomListItemCardProps> = ({ item, listId, index, totalItems, onClick, onRemove, onReorder }) => {
  return (
    <div className="flex items-center space-x-4 bg-brand-surface p-2 rounded-lg hover:bg-gray-800 transition-colors">
      <div className="flex flex-col items-center">
        <button disabled={index === 0} onClick={() => onReorder(listId, index, 'up')} className="p-1 disabled:opacity-30 disabled:cursor-not-allowed"><ArrowUpIcon className="w-5 h-5 text-brand-text-secondary hover:text-brand-primary"/></button>
        <span className="font-bold text-lg text-brand-text-primary">{index + 1}</span>
        <button disabled={index === totalItems - 1} onClick={() => onReorder(listId, index, 'down')} className="p-1 disabled:opacity-30 disabled:cursor-not-allowed"><ArrowDownIcon className="w-5 h-5 text-brand-text-secondary hover:text-brand-primary"/></button>
      </div>
      <div className="w-16 h-24 flex-shrink-0 cursor-pointer" onClick={() => onClick(item)}>
        <PosterImage path={item.poster_path} alt={item.title || item.name || 'poster'} className="w-full h-full object-cover rounded" />
      </div>
      <div className="flex-grow cursor-pointer" onClick={() => onClick(item)}>
        <h4 className="font-bold text-brand-text-primary">{item.title || item.name}</h4>
        <p className="text-sm text-brand-text-secondary">{item.release_date?.substring(0,4) || item.first_air_date?.substring(0,4)}</p>
      </div>
      <button onClick={() => onRemove(listId, item.id, item.media_type as 'movie' | 'tv')} className="p-2 text-brand-text-secondary hover:text-brand-secondary"><TrashIcon className="w-5 h-5"/></button>
    </div>
  );
};

// --- Create List Modal ---
interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => void;
}
export const CreateListModal: React.FC<CreateListModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      onCreate(name.trim(), description.trim() || undefined);
      setName(''); setDescription('');
      onClose();
    }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New List" size="md">
      <div className="space-y-4">
        <div>
          <label htmlFor="listName" className="block text-sm font-medium text-slate-300 mb-1">List Name*</label>
          <input type="text" id="listName" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., My Favorite Sci-Fi"
            className="w-full p-2.5 bg-slate-700 text-slate-200 rounded-lg border border-slate-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" />
        </div>
        <div>
          <label htmlFor="listDescription" className="block text-sm font-medium text-slate-300 mb-1">Description (Optional)</label>
          <textarea id="listDescription" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="A brief summary of your list"
            className="w-full p-2.5 bg-slate-700 text-slate-200 rounded-lg border border-slate-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700" />
        </div>
        <button onClick={handleSubmit} disabled={!name.trim()}
          className={`w-full py-3 ${ACCENT_COLOR_CLASS_BG} ${ACCENT_COLOR_CLASS_BG_HOVER} text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}>
          Create List
        </button>
      </div>
    </Modal>
  );
};

// --- Add To List Modal ---
interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItem: MediaItem | null;
  customLists: CustomList[];
  onAddToList: (listId: string, item: MediaItem) => void;
  onCreateAndAddToList: (listName: string, item: MediaItem, listDescription?: string) => void;
}
export const AddToListModal: React.FC<AddToListModalProps> = ({ isOpen, onClose, mediaItem, customLists, onAddToList, onCreateAndAddToList }) => {
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newListName, setNewListName] = useState('');

  useEffect(() => { // Reset on open
    if (isOpen) {
      setSelectedListId(customLists.length > 0 ? customLists[0].id : '');
      setShowCreateNew(customLists.length === 0);
      setNewListName('');
    }
  }, [isOpen, customLists]);

  if (!isOpen || !mediaItem) return null;

  const handleAdd = () => {
    if (showCreateNew && newListName.trim()) {
      onCreateAndAddToList(newListName.trim(), mediaItem);
    } else if (!showCreateNew && selectedListId) {
      onAddToList(selectedListId, mediaItem);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add "${mediaItem.title || mediaItem.name}" to a list`} size="md">
      <div className="space-y-4">
        {!showCreateNew && customLists.length > 0 && (
          <div>
            <label htmlFor="selectList" className="block text-sm font-medium text-slate-300 mb-1">Choose a list:</label>
            <select id="selectList" value={selectedListId} onChange={e => setSelectedListId(e.target.value)}
              className="w-full p-2.5 bg-slate-700 text-slate-200 rounded-lg border border-slate-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none">
              {customLists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
            </select>
          </div>
        )}
        {showCreateNew && (
          <div>
            <label htmlFor="newListName" className="block text-sm font-medium text-slate-300 mb-1">New List Name*</label>
            <input type="text" id="newListName" value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="e.g., Must Watch Documentaries"
              className="w-full p-2.5 bg-slate-700 text-slate-200 rounded-lg border border-slate-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" />
          </div>
        )}
        <div className="flex justify-between items-center mt-3">
          <button onClick={() => setShowCreateNew(!showCreateNew)} className={`text-sm ${ACCENT_COLOR_CLASS_TEXT} hover:underline`}>
            {showCreateNew ? (customLists.length > 0 ? 'Choose existing list' : '') : 'Or create a new list'}
          </button>
        </div>
        <button onClick={handleAdd} disabled={(!showCreateNew && !selectedListId) || (showCreateNew && !newListName.trim())}
          className={`w-full py-3 ${ACCENT_COLOR_CLASS_BG} ${ACCENT_COLOR_CLASS_BG_HOVER} text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}>
          {showCreateNew ? 'Create & Add' : 'Add to Selected List'}
        </button>
      </div>
    </Modal>
  );
};

// --- Feed Card ---
interface FeedCardProps {
    feedItem: FeedItem;
    currentUser: UserProfile;
    onCardClick: (item: MediaItem) => void;
    onReRankClick?: (item: MediaItem) => void;
}
export const FeedCard: React.FC<FeedCardProps> = ({ feedItem, currentUser, onCardClick, onReRankClick }) => {
    const actor = feedItem.user;
    const actionText = () => {
        // Using string literals for all cases that match FeedActivityType enum values
        switch (feedItem.activityType) { 
            case 'new_rating': return `rated ${feedItem.mediaItem?.title || feedItem.mediaItem?.name}`;
            case 'new_custom_list': return `added ${feedItem.mediaItem?.title || feedItem.mediaItem?.name} to their ${feedItem.customListName || 'list'}`;
            case 'new_watchlist': return `added ${feedItem.mediaItem?.title || feedItem.mediaItem?.name} to their watchlist`;
            case 'direct_rec': return `recommended ${feedItem.mediaItem?.title || feedItem.mediaItem?.name}`;
            case 'taste_match_update': return `has an updated taste match`;
            case 'group_trend': return `and friends are talking about ${feedItem.mediaItem?.title || feedItem.mediaItem?.name}`;
            // Removed 'commented_on_activity' as it's not a valid FeedActivityType
            default: 
                // If activityType is somehow not in the enum, provide a generic message or log an error.
                // console.warn("Unknown feed activity type:", feedItem.activityType);
                return 'shared an update'; 
        }
    };
    const [liked, setLiked] = useState(feedItem.likes ? feedItem.comments?.some(c => c.user.id === currentUser.id && c.text === "Liked this post") : false);
    const [comments, setComments] = useState(feedItem.comments || []);
    const [newComment, setNewComment] = useState('');
    const [showComments, setShowComments] = useState(false);

    const handleLike = () => setLiked(!liked);
    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (newComment.trim()) {
            setComments([...comments, { id: Date.now().toString(), user: currentUser, text: newComment.trim(), timestamp: new Date().toISOString() }]);
            setNewComment('');
        }
    };

    return (
        <div className="bg-neutral-800 shadow-xl rounded-xl overflow-hidden border border-neutral-700">
            <div className="p-4 sm:p-5">
                <div className="flex items-start space-x-3">
                    <PosterImage path={actor.avatarUrl || null} alt={actor.handle} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover flex-shrink-0 border-2 border-neutral-600" iconType="person" />
                    <div className="flex-grow min-w-0">
                        <p className="text-sm text-neutral-300">
                            <Link to={`/profile/${actor.id}`} className="font-semibold text-neutral-100 hover:underline">{actor.handle}</Link>
                            {' '}{actionText()}
                        </p>
                        <p className="text-xs text-neutral-500">{new Date(feedItem.timestamp).toLocaleDateString()}</p>
                    </div>
                </div>
                {feedItem.mediaItem && (
                    <div className="mt-3.5 mb-2 pl-0 sm:pl-0">
                       <MediaCard 
                         key={`${feedItem.mediaItem.id}-${feedItem.mediaItem.media_type}`}
                         item={feedItem.mediaItem} 
                         onClick={() => onCardClick(feedItem.mediaItem!)}
                         onReRankClick={onReRankClick ? () => onReRankClick(feedItem.mediaItem!) : undefined}
                       />
                   </div>
                )}

                <div className="mt-4 pt-3 border-t border-neutral-700 flex items-center space-x-4">
                    <button onClick={handleLike} className={`flex items-center text-sm transition-colors ${liked ? 'text-red-500' : 'text-neutral-400 hover:text-red-400'}`}>
                        <HeartIcon className="w-5 h-5 mr-1.5" _fill={liked} />
                        { (feedItem.likes || 0) + (liked && !(feedItem.likes && feedItem.comments?.some(c => c.user.id === currentUser.id && c.text === "Liked this post")) ? 1 : 0) } Likes
                    </button>
                    <button onClick={() => setShowComments(!showComments)} className="flex items-center text-sm text-neutral-400 hover:text-cyan-400 transition-colors">
                        <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5 mr-1.5" /> {comments.length} Comments
                    </button>
                </div>

                {showComments && (
                    <div className="mt-3 space-y-3">
                        <form onSubmit={handleAddComment} className="flex space-x-2 items-center">
                            <PosterImage path={currentUser.avatarUrl || null} alt={currentUser.handle} className="w-7 h-7 rounded-full object-cover flex-shrink-0" iconType="person" />
                            <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..."
                                className="flex-grow p-2 text-sm bg-neutral-700 text-neutral-200 rounded-lg border border-neutral-600 focus:ring-1 focus:ring-cyan-500 outline-none"/>
                            <button type="submit" disabled={!newComment.trim()} className={`px-3 py-1.5 text-sm ${ACCENT_COLOR_CLASS_BG} ${ACCENT_COLOR_CLASS_BG_HOVER} text-white rounded-lg font-medium disabled:opacity-60 disabled:cursor-not-allowed`}>Post</button>
                        </form>
                        {comments.map(comment => (
                            <div key={comment.id} className="flex items-start space-x-2.5 pl-9">
                                <PosterImage path={comment.user.avatarUrl || null} alt={comment.user.handle} className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-neutral-600" iconType="person" />
                                <div className="bg-neutral-700 px-3 py-2 rounded-lg">
                                    <p className="text-xs">
                                        <Link to={`/profile/${comment.user.id}`} className="font-semibold text-neutral-100 hover:underline">{comment.user.handle}</Link>
                                        <span className="text-neutral-500 ml-1.5 text-[10px]">{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </p>
                                    <p className="text-sm text-neutral-200 break-words">{comment.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
