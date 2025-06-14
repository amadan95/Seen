import React, { useState, useEffect, useCallback, useRef } from 'react';
// Fix: Add CrewMember, FeedItem, FeedActivityType to types import
import { MediaItem, Reaction, RatedItem, TMDBGenre, CastMember, CrewMember, Episode, RankedItem, ComparisonStep, WatchProviderDetails, WatchProviderCountryResult, TMDBMovie, TMDBShow, CustomList, CustomListMediaItem, UserProfile, FeedComment, PersonCreditItem, FeedItem, FeedActivityType } from './types';
import { REACTION_EMOJIS, REACTION_LABELS, TMDB_IMAGE_BASE_URL_W500, TMDB_IMAGE_BASE_URL_ORIGINAL, ACCENT_COLOR_CLASS_TEXT, ACCENT_COLOR_CLASS_BG, ACCENT_COLOR_CLASS_BG_HOVER, ACCENT_COLOR_CLASS_BORDER, ACCENT_COLOR_CLASS_RING } from './constants';
// Fix: Add ListBulletIcon to icons import
import { XMarkIcon, EyeIcon, StarIcon, CheckIcon, QuestionMarkCircleIcon, UserIcon, ChevronDoubleRightIcon, ChevronDoubleLeftIcon, ChatBubbleLeftEllipsisIcon, InformationCircleIcon, ArrowUpIcon, ArrowDownIcon, HeartIcon, ChatBubbleOvalLeftEllipsisIcon, PlusCircleIcon, PencilIcon, TrashIcon, FilmIcon, TvIcon, RectangleStackIcon, ListBulletIcon, BookmarkIcon, BookmarkSquareIcon, CheckCircleIcon, SparklesIcon } from './icons'; // Added BookmarkIcon, BookmarkSquareIcon, CheckCircleIcon, SparklesIcon
import { tmdbService, userListService } from './services';
import { Link } from 'react-router-dom'; // For navigation

// --- Skeleton Loader ---
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
}
export const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'rect', width, height }) => {
  const baseStyle = `animate-pulse bg-slate-700`;
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
      <div className={`flex items-center justify-center bg-slate-700 text-slate-500 rounded-lg ${className || 'w-full h-full'}`}>
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
      className={`bg-neutral-800 rounded-lg shadow-md overflow-hidden group transform hover:scale-105 hover:bg-neutral-700/60 transition-all duration-300 cursor-pointer ${className}`}
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
              className={`p-1.5 rounded-full transition-colors transform hover:scale-110 ${isSeen ? 'bg-green-500/90 hover:bg-green-400/95' : 'bg-slate-800/80 hover:bg-slate-700/90 backdrop-blur-sm'}`}
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
              className={`p-1.5 rounded-full transition-colors transform hover:scale-110 ${isWatchlisted ? 'bg-cyan-500/90 hover:bg-cyan-400/95' : 'bg-slate-800/80 hover:bg-slate-700/90 backdrop-blur-sm'}`}
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
            <StarIcon className="w-3 h-3 text-cyan-400 mr-0.5" />
            {recScore.toFixed(1)} Rec
          </div>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-semibold truncate text-neutral-100 group-hover:text-white transition-colors" title={title}>{title}</h3>
        {context === 'personCredits' && (item as PersonCreditItem).character && (
            <p className="text-xs text-neutral-400 truncate" title={(item as PersonCreditItem).character}>As: {(item as PersonCreditItem).character}</p>
        )}
        {context === 'personCredits' && (item as PersonCreditItem).job && (
            <p className="text-xs text-neutral-400 truncate" title={(item as PersonCreditItem).job}>Job: {(item as PersonCreditItem).job}</p>
        )}
        <div className="flex items-center justify-between text-xs text-neutral-400 mt-0.5">
          <span>{releaseYear}</span>
          {item.vote_average > 0 && context !== 'personCredits' && (
             <div className="flex items-center">
               <StarIcon className="w-3 h-3 text-yellow-500 mr-0.5" />
               <span className="text-neutral-300">{item.vote_average.toFixed(1)}</span>
             </div>
          )}
        </div>
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
      className={`flex bg-slate-800 rounded-xl shadow-lg overflow-hidden hover:bg-slate-700/70 transition-colors duration-200 cursor-pointer border border-slate-700 hover:${ACCENT_COLOR_CLASS_BORDER}`}
      onClick={() => onClick?.(item)} role="button" tabIndex={0} onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(item);}}
    >
      <div className="w-28 md:w-32 flex-shrink-0">
        <PosterImage path={item.poster_path} alt={title} className="w-full h-full object-cover" />
      </div>
      <div className="p-4 flex-grow flex flex-col justify-between relative">
        <div className="pr-16 md:pr-20">
          <h3 className="text-md md:text-lg font-semibold text-slate-100">{title}</h3>
          <p className="text-xs md:text-sm text-slate-400">{releaseYear} &bull; {item.genres?.map(g => g.name).join(', ') || 'N/A'}</p>
          <p className="text-xs md:text-sm text-slate-400">Runtime: {(item as RankedItem).runtimeCategory} &bull; Lang: {item.original_language?.toUpperCase()}</p>
          <p className="text-xs md:text-sm mt-1 line-clamp-2 md:line-clamp-3 text-slate-300">{item.overview}</p>
        </div>
        {displayScore !== null && (
          <div 
            className={`absolute top-1/2 right-4 transform -translate-y-1/2 
                        w-10 h-10 md:w-11 md:h-11 rounded-full border-2 ${ACCENT_COLOR_CLASS_BORDER} 
                        flex items-center justify-center flex-shrink-0`}
          >
            <p className={`text-sm md:text-base font-semibold ${ACCENT_COLOR_CLASS_TEXT}`}>{displayScore.toFixed(1)}</p>
          </div>
        )}
        <div className="mt-3">
          {item.userNotes && 
            <div className="flex items-center text-slate-500">
                <ChatBubbleLeftEllipsisIcon className="w-4 h-4 inline-block mr-1" title="Has notes"/> 
                <span className="text-xs">Notes</span>
            </div>
          }
        </div>
      </div>
    </div>
  );
};

// --- Reaction Picker ---
interface ReactionPickerProps { onSelectReaction: (reaction: Reaction) => void; }
export const ReactionPicker: React.FC<ReactionPickerProps> = ({ onSelectReaction }) => (
  <div className="flex justify-around items-center py-4">
    {(Object.keys(Reaction) as Array<keyof typeof Reaction>).map((key) => (
      <button key={Reaction[key]} onClick={() => onSelectReaction(Reaction[key])}
        className={`flex flex-col items-center p-3 rounded-xl hover:bg-slate-600 transition-all duration-200 focus:outline-none focus:ring-2 ${ACCENT_COLOR_CLASS_RING} ring-offset-2 ring-offset-slate-800 transform hover:scale-110`}
        aria-label={REACTION_LABELS[Reaction[key]]}
      >
        <span className="text-5xl">{REACTION_EMOJIS[Reaction[key]]}</span>
        <span className="mt-2 text-sm text-slate-300">{REACTION_LABELS[Reaction[key]]}</span>
      </button>
    ))}
  </div>
);

// --- Notes Textarea ---
interface NotesTextareaProps { value: string; onChange: (value: string) => void; placeholder?: string; }
export const NotesTextarea: React.FC<NotesTextareaProps> = ({ value, onChange, placeholder = "Add your personal notes or review..." }) => (
  <div className="mt-4">
    <label htmlFor="userNotes" className="block text-sm font-medium text-slate-300 mb-1">Your Notes (Optional)</label>
    <textarea id="userNotes" rows={3}
      className="w-full p-2 bg-slate-700 text-slate-200 rounded-lg border border-slate-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700"
      placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
    />
  </div>
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-2xl w-full max-w-3xl text-center border border-slate-700 relative">
        <button
          onClick={onClose}
          className="absolute top-3 left-3 sm:top-4 sm:left-4 text-slate-400 hover:text-white transition-colors z-10"
          aria-label="Close comparison"
        >
          <XMarkIcon className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
        <h2 className={`text-2xl font-semibold mb-6 ${ACCENT_COLOR_CLASS_TEXT}`}>Which do you prefer?</h2>
        <div className="flex flex-row justify-center items-start gap-x-3 w-full mb-6">
          {[itemA, itemB].map((item) => (
            <div 
              key={`${item.id}-${item.media_type}`} 
              onClick={() => onChoose(item)} 
              role="button" 
              tabIndex={0} 
              onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') onChoose(item);}}
              className="flex-1 min-w-0 max-w-[160px] cursor-pointer group"
              aria-label={`Choose ${item.title || item.name}`}
            >
              <PosterImage 
                path={item.poster_path} 
                alt={item.title || item.name || ''} 
                className="w-full aspect-[2/3] object-cover rounded-md shadow-md group-hover:ring-2 group-hover:ring-cyan-400 ring-offset-slate-800 ring-offset-1 transition-colors"
              />
              <div className="mt-2 text-center">
                <h3 className="font-medium truncate group-hover:text-cyan-400 text-sm sm:text-base md:text-lg">{item.title || item.name}</h3>
                <p className="text-xs text-slate-400 truncate">{item.genres?.slice(0,2).map(g=>g.name).join(', ')}</p>
                <p className="text-xs text-slate-400 truncate">{item.media_type === 'movie' ? 'Movie' : 'TV Show'} &bull; {item.original_language?.toUpperCase()}</p>
              </div>
            </div>
          ))}
        </div>
        {onTooTough && (
          <div className="mt-12 flex justify-center">
            <button 
              onClick={onTooTough} 
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors font-semibold text-xs"
              aria-label="Too tough to call"
            >
              Too tough
            </button>
          </div>
        )}
      </div>
    </div>
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

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    try {
      const data = await tmdbService.searchMedia(query, 1);
      const validSuggestions = data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv').slice(0, 5);
      setSuggestions(validSuggestions); setShowSuggestions(validSuggestions.length > 0);
    } catch (error) { console.error("Failed to fetch search suggestions:", error); setSuggestions([]); setShowSuggestions(false); }
  }, []);
  const debouncedFetchSuggestions = useCallback(debounce(fetchSuggestions, 300), [fetchSuggestions]);
  useEffect(() => { debouncedFetchSuggestions(localQuery); }, [localQuery, debouncedFetchSuggestions]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) setShowSuggestions(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setLocalQuery(e.target.value);
  const handleSuggestionClick = (suggestion: MediaItem) => {
    const title = suggestion.title || suggestion.name || ""; setLocalQuery(title); setShowSuggestions(false); onSearch(title.trim());
  };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setShowSuggestions(false); onSearch(localQuery.trim()); };

  return (
    <div className="relative w-full" ref={searchContainerRef}>
      <form onSubmit={handleSubmit} className="w-full">
        <input type="search" value={localQuery} onChange={handleInputChange} onFocus={() => localQuery.length >=2 && suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder} className={`w-full p-3.5 bg-slate-700 text-slate-200 rounded-xl border border-slate-600 focus:ring-2 ${ACCENT_COLOR_CLASS_RING} ${ACCENT_COLOR_CLASS_BORDER} outline-none transition-colors placeholder-slate-400`}
          aria-haspopup="listbox" aria-expanded={showSuggestions}
        />
      </form>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1.5 bg-slate-700 border border-slate-600 rounded-xl shadow-xl z-20 overflow-hidden max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-700" role="listbox">
          {suggestions.map((item) => (
            <li key={`${item.id}-${item.media_type}`} onClick={() => handleSuggestionClick(item)} onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSuggestionClick(item);}}
              className="flex items-center p-3 hover:bg-slate-600 cursor-pointer transition-colors" role="option" aria-selected="false" tabIndex={0}>
              <PosterImage path={item.poster_path} alt={item.title || item.name || "Suggestion poster"} className="w-10 h-14 object-cover rounded-md mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">{item.title || item.name}</p>
                <p className="text-xs text-slate-400">{item.media_type === 'movie' ? 'Movie' : 'TV Show'} {(item.release_date || item.first_air_date) && ` • ${(item.release_date || item.first_air_date)!.substring(0,4)}`}</p>
              </div>
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
  const sizeClasses: Record<typeof size, string> = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl', '3xl': 'max-w-3xl' };
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby={title ? "modal-title" : undefined}>
      <div className={`bg-slate-800 p-6 rounded-xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700 border border-slate-700`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          {title && <h2 id="modal-title" className={`text-2xl font-semibold ${ACCENT_COLOR_CLASS_TEXT}`}>{title}</h2>}
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close modal"><XMarkIcon className="w-7 h-7" /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

// --- Cast Card ---
interface CastCardProps { member: CastMember; onClick: (personId: number) => void; }
export const CastCard: React.FC<CastCardProps> = ({ member, onClick }) => (
  <div onClick={() => onClick(member.id)} role="button" tabIndex={0} onKeyPress={e => {if(e.key === 'Enter' || e.key === ' ') onClick(member.id);}}
    className="bg-slate-800 rounded-xl shadow-lg overflow-hidden w-36 flex-shrink-0 border border-slate-700 hover:border-cyan-500 transition-colors cursor-pointer">
    <PosterImage path={member.profile_path} alt={member.name} className="w-full h-48 object-cover" iconType="person"/>
    <div className="p-2.5">
      <p className="text-sm font-semibold truncate text-slate-100" title={member.name}>{member.name}</p>
      <p className="text-xs text-slate-400 truncate" title={member.character}>{member.character}</p>
    </div>
  </div>
);

// --- Crew Member Display (for MediaDetailPage) ---
interface CrewMemberDisplayProps { member: CrewMember; onClick: (personId: number) => void; }
export const CrewMemberDisplay: React.FC<CrewMemberDisplayProps> = ({member, onClick}) => (
    <button 
        onClick={() => onClick(member.id)}
        className="text-left p-2 hover:bg-slate-700 rounded-md transition-colors w-full"
    >
        <p className="text-sm font-medium text-slate-200">{member.name}</p>
        <p className="text-xs text-slate-400">{member.job} ({member.department})</p>
    </button>
);

// --- Episode Card ---
interface EpisodeCardProps { episode: Episode; showStill?: boolean; }
export const EpisodeCard: React.FC<EpisodeCardProps> = ({ episode, showStill = true }) => (
  <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden flex border border-slate-700">
    {showStill && episode.still_path && (<div className="w-36 h-24 flex-shrink-0"><PosterImage path={episode.still_path} alt={`Still from ${episode.name}`} className="w-full h-full object-cover" /></div>)}
    {!showStill && episode.still_path === null && (<div className="w-36 h-24 flex-shrink-0"><div className="w-full h-full bg-slate-700 rounded-l-xl flex items-center justify-center"><QuestionMarkCircleIcon className="w-10 h-10 text-slate-500" /></div></div>)}
    <div className="p-3.5 flex-grow">
      <h4 className="text-sm font-semibold text-slate-100">S{String(episode.season_number).padStart(2,'0')}E{String(episode.episode_number).padStart(2,'0')}: {episode.name}</h4>
      <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
        {episode.air_date && <span>Air Date: {new Date(episode.air_date).toLocaleDateString()}</span>}
        {episode.vote_average > 0 && (<div className="flex items-center"><StarIcon className="w-3 h-3 text-yellow-400 mr-0.5"/><span>{episode.vote_average.toFixed(1)}</span></div>)}
      </div>
      <p className="text-xs text-slate-300 mt-1.5 line-clamp-2">{episode.overview || "No overview available."}</p>
    </div>
  </div>
);

// --- Comparison Summary Modal ---
interface ComparisonSummaryModalProps { isOpen: boolean; onClose: () => void; rankedItem: RankedItem | null; comparisonHistory: ComparisonStep[]; totalComparisonsMade: number; }
export const ComparisonSummaryModal: React.FC<ComparisonSummaryModalProps> = ({ isOpen, onClose, rankedItem, comparisonHistory, totalComparisonsMade }) => {
  if (!isOpen || !rankedItem) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ranking Complete!" size="lg">
      <div className="space-y-5">
        <div>
          <h3 className={`text-xl font-semibold ${ACCENT_COLOR_CLASS_TEXT}`}>{rankedItem.title || rankedItem.name}</h3>
          <p className="text-slate-200">Your new score: <span className="font-bold text-2xl">{rankedItem.personalScore.toFixed(1)}/10</span></p>
          <p className="text-slate-300">Placed at rank: <span className="font-bold">#{rankedItem.rank + 1}</span> in its category.</p>
        </div>
        <div className="border-t border-slate-700 pt-4">
          <h4 className="font-semibold mb-2 text-slate-100">Comparison Journey ({totalComparisonsMade} step{totalComparisonsMade !== 1 ? 's' : ''}):</h4>
          {comparisonHistory.length === 0 ? (<p className="text-sm text-slate-400">No direct comparisons were needed for placement.</p>) : (
            <ul className="space-y-2.5 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700">
              {comparisonHistory.map((step, index) => (
                <li key={index} className="text-sm p-3 bg-slate-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="truncate font-medium text-slate-200">{rankedItem.title || rankedItem.name}</span>
                    {step.userPreferredNewItem ? <ChevronDoubleRightIcon className="w-5 h-5 text-green-400 mx-2 flex-shrink-0" title="Preferred"/> : <ChevronDoubleLeftIcon className="w-5 h-5 text-red-400 mx-2 flex-shrink-0" title="Not Preferred"/>}
                    <span className="truncate text-right text-slate-300">{step.itemComparedAgainst.title || step.itemComparedAgainst.name}</span>
                  </div>
                  {step.promptUsed && <p className="text-xs text-slate-500 mt-1 italic">Prompt: "{step.promptUsed}"</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button onClick={onClose} className={`mt-6 w-full px-6 py-3 ${ACCENT_COLOR_CLASS_BG} ${ACCENT_COLOR_CLASS_BG_HOVER} text-white rounded-lg transition-colors font-semibold text-lg`}>Got it!</button>
      </div>
    </Modal>
  );
};

// --- Watch Provider Display ---
interface WatchProviderDisplayProps { providers: WatchProviderCountryResult | undefined; itemTitle: string; }
export const WatchProviderDisplay: React.FC<WatchProviderDisplayProps> = ({ providers, itemTitle }) => {
  if (!providers) return <p className="text-sm text-slate-500">Watch provider information not available.</p>;
  const providerSections: { title: string; list?: WatchProviderDetails[] }[] = [
    { title: "Stream", list: providers.flatrate }, { title: "Rent", list: providers.rent }, { title: "Buy", list: providers.buy },
    { title: "Ads", list: providers.ads }, { title: "Free", list: providers.free },
  ].filter(section => section.list && section.list.length > 0);
  if (providerSections.length === 0) return <p className="text-sm text-slate-500">No watch options found for your region (US default).</p>;
  return (
    <div className="space-y-4">
      {providerSections.map(section => (
        <div key={section.title}>
          <h3 className="text-md font-semibold text-slate-300 mb-2">{section.title}</h3>
          <div className="flex flex-wrap gap-3">
            {section.list?.sort((a,b) => a.display_priority - b.display_priority).map(p => (
              <a key={p.provider_id} href={providers.link || '#'} target="_blank" rel="noopener noreferrer" title={p.provider_name}
                className="flex items-center bg-slate-700/60 hover:bg-slate-600/80 p-2 rounded-lg transition-colors duration-150 shadow">
                <img src={`${TMDB_IMAGE_BASE_URL_W500}${p.logo_path}`} alt={p.provider_name} className="w-10 h-10 object-contain rounded-md" />
                <span className="text-xs text-slate-300 ml-2 hidden sm:inline">{p.provider_name}</span>
              </a>
            ))}
          </div>
        </div>
      ))}
      {providers.link && <a href={providers.link} target="_blank" rel="noopener noreferrer" className={`text-xs ${ACCENT_COLOR_CLASS_TEXT} hover:underline mt-2 inline-flex items-center`}>View all options on TMDB <InformationCircleIcon className="w-3 h-3 ml-1"/></a>}
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
  const title = item.title || item.name || 'Untitled';
  const releaseYear = item.release_date?.substring(0,4) || item.first_air_date?.substring(0,4) || '';
  return (
    <div className={`flex bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700`}>
      <div className="w-20 md:w-24 flex-shrink-0 cursor-pointer" onClick={() => onClick(item)}>
        <PosterImage path={item.poster_path} alt={title} className="w-full h-full object-cover" />
      </div>
      <div className="p-3 flex-grow cursor-pointer min-w-0" onClick={() => onClick(item)}>
        <h3 className="text-sm md:text-base font-semibold text-slate-100 truncate">{title}</h3>
        <p className="text-xs text-slate-400">{releaseYear} &bull; {item.media_type === 'movie' ? 'Movie' : 'TV Show'}</p>
        <p className="text-xs text-slate-400 line-clamp-1 md:line-clamp-2">{item.overview}</p>
      </div>
      <div className="p-2 flex flex-col items-center justify-center space-y-1.5 border-l border-slate-700 flex-shrink-0">
        <button onClick={() => onReorder(listId, index, 'up')} disabled={index === 0} className="p-1.5 text-slate-400 hover:text-cyan-400 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-slate-700"><ArrowUpIcon className="w-4 h-4"/></button>
        <button onClick={() => onReorder(listId, index, 'down')} disabled={index === totalItems - 1} className="p-1.5 text-slate-400 hover:text-cyan-400 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-slate-700"><ArrowDownIcon className="w-4 h-4"/></button>
        <button onClick={() => onRemove(listId, item.id, item.media_type as 'movie'|'tv')} className="p-1.5 text-red-500 hover:text-red-400 transition-colors rounded-md hover:bg-slate-700"><TrashIcon className="w-4 h-4"/></button>
      </div>
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
