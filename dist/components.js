import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tmdbService } from './services';
// Import ALL value constants from './constants'
import { REACTION_EMOJIS, REACTION_LABELS, ACCENT_TEXT_COLOR, ACCENT_BG_COLOR, ACCENT_BORDER_COLOR
// Add other constants like APP_NAME, TMDB_IMAGE_BASE_URL_W500 if needed directly in components,
// but typically service functions (tmdbService.getImageUrl) encapsulate these.
 } from './constants';
// Import ALL icons from './icons'
import { XIcon, PlusIcon, TrashIcon, EyeIcon, FilmIcon, TvIcon, ExternalLinkIcon, SearchIcon, UserIcon, CheckIcon } from './icons';
// Debounce hook
function useDebounce(value, delay) {
    var _a = useState(value), debouncedValue = _a[0], setDebouncedValue = _a[1];
    useEffect(function () {
        var handler = setTimeout(function () {
            setDebouncedValue(value);
        }, delay);
        return function () {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}
// **** Basic Reusable Components ****
export var Skeleton = function (_a) {
    var _b = _a.className, className = _b === void 0 ? '' : _b;
    return (_jsx("div", { className: "animate-pulse bg-slate-700 rounded ".concat(className) }));
};
export var PosterImage = function (_a) {
    var posterPath = _a.posterPath, altText = _a.altText, _b = _a.className, className = _b === void 0 ? 'w-full h-auto' : _b, _c = _a.size, size = _c === void 0 ? 'w500' : _c, _d = _a.clickable, clickable = _d === void 0 ? false : _d, onClick = _a.onClick;
    var imageUrl = tmdbService.getImageUrl(posterPath, size);
    if (!imageUrl) {
        return (_jsx("div", { className: "bg-slate-800 flex items-center justify-center text-slate-500 ".concat(className, " rounded"), children: _jsx(FilmIcon, { size: 48 }) }));
    }
    return (_jsx("img", { src: imageUrl, alt: altText, className: "".concat(className, " object-cover rounded ").concat(clickable ? 'cursor-pointer' : ''), loading: "lazy", onClick: onClick }));
};
export var Modal = function (_a) {
    var isOpen = _a.isOpen, onClose = _a.onClose, title = _a.title, children = _a.children, _b = _a.size, size = _b === void 0 ? 'md' : _b, _c = _a.hideCloseButton, hideCloseButton = _c === void 0 ? false : _c;
    if (!isOpen)
        return null;
    var sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        full: 'max-w-full h-full'
    };
    return (_jsxs("div", { className: "fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out", onClick: onClose, children: [_jsxs("div", { className: "bg-slate-800 rounded-lg shadow-xl p-6 relative w-full ".concat(sizeClasses[size], " transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalFadeIn"), onClick: function (e) { return e.stopPropagation(); }, children: [!hideCloseButton && (_jsx("button", { onClick: onClose, className: "absolute top-3 right-3 text-slate-400 hover:text-slate-100 ".concat(ACCENT_TEXT_COLOR, " hover:").concat(ACCENT_TEXT_COLOR.replace("500", "400"), " transition-colors"), children: _jsx(XIcon, { size: 24 }) })), title && _jsx("h2", { className: "text-xl font-semibold mb-4 text-slate-100", children: title }), _jsx("div", { className: "text-slate-300 max-h-[80vh] overflow-y-auto custom-scrollbar", children: children })] }), _jsx("style", { children: "\n                @keyframes modalFadeIn {\n                    to {\n                        opacity: 1;\n                        transform: scale(1);\n                    }\n                }\n                .animate-modalFadeIn {\n                    animation: modalFadeIn 0.3s forwards;\n                }\n            " })] }));
};
export var MediaCard = function (_a) {
    var item = _a.item, onClick = _a.onClick, _b = _a.className, className = _b === void 0 ? '' : _b, _c = _a.showType, showType = _c === void 0 ? false : _c;
    var navigate = useNavigate();
    var mediaTitle = item.title || item.name || 'Untitled';
    var itemMediaType = item.media_type || item.mediaType || (item.title ? 'movie' : 'tv');
    var releaseDate = item.release_date || item.first_air_date;
    var year = releaseDate ? new Date(releaseDate).getFullYear().toString() : item.releaseYear || 'N/A';
    var handleCardClick = function () {
        if (onClick) {
            onClick();
        }
        else {
            navigate("/media/".concat(itemMediaType, "/").concat(item.id));
        }
    };
    return (_jsxs("div", { className: "bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-cyan-500/30 transition-shadow duration-300 group ".concat(className, " ").concat(onClick || itemMediaType ? 'cursor-pointer' : ''), onClick: handleCardClick, role: onClick || itemMediaType ? "button" : undefined, tabIndex: onClick || itemMediaType ? 0 : undefined, onKeyDown: function (e) { return (e.key === 'Enter' || e.key === ' ') && handleCardClick(); }, children: [_jsx(PosterImage, { posterPath: item.poster_path || item.posterPath, altText: mediaTitle, className: "w-full h-64 md:h-72 lg:h-80 group-hover:scale-105 transition-transform duration-300" }), _jsxs("div", { className: "p-3", children: [_jsx("h3", { className: "text-md font-semibold text-slate-100 truncate group-hover:text-cyan-400 transition-colors", title: mediaTitle, children: mediaTitle }), _jsx("p", { className: "text-xs text-slate-400", children: year }), showType && (_jsx("span", { className: "mt-1 inline-block px-2 py-0.5 text-xs rounded-full ".concat(itemMediaType === 'movie' ? 'bg-blue-600' : 'bg-teal-600', " text-slate-100"), children: itemMediaType === 'movie' ? 'Movie' : 'TV Show' }))] })] }));
};
export var RatedMediaCard = function (_a) {
    var item = _a.item, onClick = _a.onClick, _b = _a.className, className = _b === void 0 ? '' : _b;
    var navigate = useNavigate();
    var handleCardClick = function () {
        if (onClick) {
            onClick();
        }
        else {
            navigate("/media/".concat(item.mediaType, "/").concat(item.tmdbId));
        }
    };
    return (_jsxs("div", { className: "relative bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-cyan-500/30 transition-shadow duration-300 group ".concat(className, " cursor-pointer"), onClick: handleCardClick, role: "button", tabIndex: 0, onKeyDown: function (e) { return (e.key === 'Enter' || e.key === ' ') && handleCardClick(); }, children: [_jsx(PosterImage, { posterPath: item.posterPath, altText: item.title, className: "w-full h-64 md:h-72 lg:h-80 group-hover:scale-105 transition-transform duration-300" }), _jsx("div", { className: "absolute top-2 right-2 bg-slate-900 bg-opacity-80 px-2 py-1 rounded-full text-xs font-semibold ${ACCENT_TEXT_COLOR}", children: item.personalScore.toFixed(1) }), _jsx("div", { className: "absolute top-2 left-2 bg-slate-900 bg-opacity-80 px-2 py-1 rounded-full text-2xl", children: REACTION_EMOJIS[item.reaction] }), _jsxs("div", { className: "p-3", children: [_jsx("h3", { className: "text-md font-semibold text-slate-100 truncate group-hover:text-cyan-400 transition-colors", title: item.title, children: item.title }), _jsxs("p", { className: "text-xs text-slate-400", children: [item.releaseYear, " - Rank: ", item.rank] }), item.notes && (_jsxs("p", { className: "text-xs text-slate-500 mt-1 italic truncate", title: item.notes, children: ["Notes: ", item.notes] }))] })] }));
};
export var ReactionPicker = function (_a) {
    var selectedReaction = _a.selectedReaction, onReactionSelect = _a.onReactionSelect;
    return (_jsx("div", { className: "flex space-x-2 justify-center my-4", children: Object.keys(REACTION_EMOJIS).map(function (reaction) { return (_jsxs("button", { onClick: function () { return onReactionSelect(reaction); }, className: "p-3 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-110 \n                                ".concat(selectedReaction === reaction
                ? "".concat(ACCENT_BG_COLOR, " text-white shadow-lg scale-110")
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'), "aria-pressed": selectedReaction === reaction, title: "Rate as ".concat(REACTION_LABELS[reaction]), children: [_jsx("span", { className: "text-2xl", role: "img", "aria-label": REACTION_LABELS[reaction], children: REACTION_EMOJIS[reaction] }), _jsx("span", { className: "block text-xs mt-1 sr-only", children: REACTION_LABELS[reaction] })] }, reaction)); }) }));
};
export var NotesTextarea = function (_a) {
    var value = _a.value, onChange = _a.onChange, _b = _a.placeholder, placeholder = _b === void 0 ? "Your notes... (optional)" : _b, _c = _a.maxLength, maxLength = _c === void 0 ? 500 : _c;
    return (_jsxs("div", { className: "w-full my-4", children: [_jsx("textarea", { value: value, onChange: function (e) { return onChange(e.target.value); }, placeholder: placeholder, maxLength: maxLength, rows: 3, className: "w-full p-2 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors text-slate-200 placeholder-slate-500 custom-scrollbar" }), _jsxs("p", { className: "text-xs text-slate-500 text-right mt-1", children: [value.length, " / ", maxLength] })] }));
};
export var PairwiseComparisonModal = function (_a) {
    var isOpen = _a.isOpen, onClose = _a.onClose, item1 = _a.item1, item2 = _a.item2, newItem = _a.newItem, comparisonPrompt = _a.comparisonPrompt, onChooseItem = _a.onChooseItem, _b = _a.isLoadingPrompt, isLoadingPrompt = _b === void 0 ? false : _b;
    var _c = useState(window.innerWidth), screenWidth = _c[0], setScreenWidth = _c[1];
    useEffect(function () {
        var handleResize = function () { return setScreenWidth(window.innerWidth); };
        window.addEventListener('resize', handleResize);
        return function () { return window.removeEventListener('resize', handleResize); };
    }, []);
    var isMobile = screenWidth < 768;
    var renderItemDisplay = function (item, isBeingRanked) {
        if (isBeingRanked === void 0) { isBeingRanked = false; }
        return (_jsxs("div", { className: "flex ".concat(isMobile ? 'flex-row items-center space-x-3' : 'flex-col items-center text-center', " p-2 bg-slate-700 rounded-md"), children: [_jsx(PosterImage, { posterPath: item.posterPath, altText: item.title, className: "".concat(isMobile ? 'w-16 h-24' : 'w-28 h-40', " rounded object-cover shadow-md") }), _jsxs("div", { className: "".concat(isMobile ? 'flex-grow' : 'mt-2'), children: [_jsx("p", { className: "font-semibold ".concat(isMobile ? 'text-sm' : 'text-md', " ").concat(isBeingRanked ? ACCENT_TEXT_COLOR : 'text-slate-100'), children: item.title }), _jsx("p", { className: "text-xs text-slate-400", children: item.releaseYear })] })] }));
    };
    // Handler for choosing item1 or item2
    // This logic might need refinement based on how binary search is implemented.
    // 'before' means newItem comes before item1
    // 'after' means newItem comes after item2
    // 'between' means newItem comes between item1 and item2
    var handleSelect = function (selectedChoice) {
        switch (selectedChoice) {
            case 'item1': // User prefers item1 over item2, implying newItem is ranked relative to this pair.
                // If newItem is better than item1, it goes before item1.
                // If item1 is better than newItem, decision about item2 vs newItem might be next.
                // This simplified handler might pass item1 and 'before' or item2 and 'after' depending on context of newItem.
                // For a true binary search, the choice helps narrow down the insertion point.
                // Let's assume choosing item1 means newItem is considered *after* item1 if item1 is preferred.
                onChooseItem(item1, 'after'); // Placeholder: actual logic depends on ranking algorithm
                break;
            case 'item2': // User prefers item2 over item1.
                onChooseItem(item2, 'before'); // Placeholder
                break;
            case 'newItemBetween': // User explicitly places newItem between item1 and item2
                onChooseItem(newItem, 'between');
                break;
            // Cases for newItem being definitively first or last relative to the current pair
            // These might be separate buttons or derived if the comparison is always item1 vs item2
            case 'newItemFirst': // newItem is better than both item1 (and implicitly item2 if item1 was better)
                onChooseItem(newItem, 'before'); // Before item1 (which is the "lower" bound of current compare)
                break;
            case 'newItemLast': // newItem is worse than both item2 (and implicitly item1 if item2 was worse)
                onChooseItem(newItem, 'after'); // After item2 (which is the "upper" bound of current compare)
                break;
        }
        onClose(); // Close modal after a choice is made
    };
    return (_jsx(Modal, { isOpen: isOpen, onClose: onClose, title: "Rank: ".concat(newItem.title), size: "xl", hideCloseButton: true, children: _jsxs("div", { className: "p-2 md:p-4", children: [_jsx("p", { className: "text-center text-slate-300 mb-4 md:mb-6 text-sm md:text-base", children: isLoadingPrompt ? _jsx(Skeleton, { className: "h-5 w-3/4 mx-auto" }) : comparisonPrompt }), _jsxs("div", { className: "grid ".concat(isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6', " items-stretch mb-6"), children: [_jsxs("button", { onClick: function () { return handleSelect('item1'); }, className: "bg-slate-800 p-3 rounded-lg hover:bg-slate-700/70 border-2 border-transparent hover:border-cyan-500 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-md hover:shadow-lg", children: [renderItemDisplay(item1), _jsxs("span", { className: "mt-3 block text-sm text-cyan-400 group-hover:text-cyan-300", children: ["Choose ", item1.title] })] }), _jsxs("button", { onClick: function () { return handleSelect('item2'); }, className: "bg-slate-800 p-3 rounded-lg hover:bg-slate-700/70 border-2 border-transparent hover:border-cyan-500 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-md hover:shadow-lg", children: [renderItemDisplay(item2), _jsxs("span", { className: "mt-3 block text-sm text-cyan-400 group-hover:text-cyan-300", children: ["Choose ", item2.title] })] })] }), _jsxs("p", { className: "text-center text-slate-400 mb-2 text-sm", children: ["Or, where does ", _jsx("strong", { className: ACCENT_TEXT_COLOR, children: newItem.title }), " fit?"] }), _jsxs("div", { className: "grid ".concat(isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-4', " mb-6"), children: [_jsx("button", { onClick: function () { return handleSelect('newItemFirst'); }, className: "w-full bg-sky-600 hover:bg-sky-500 text-white font-medium py-2 px-4 rounded-md transition-colors shadow-sm hover:shadow-md disabled:opacity-50", children: "Better than both" }), _jsx("button", { onClick: function () { return handleSelect('newItemBetween'); }, className: "w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-4 rounded-md transition-colors shadow-sm hover:shadow-md disabled:opacity-50", children: "Between these two" }), _jsx("button", { onClick: function () { return handleSelect('newItemLast'); }, className: "w-full bg-rose-600 hover:bg-rose-500 text-white font-medium py-2 px-4 rounded-md transition-colors shadow-sm hover:shadow-md disabled:opacity-50", children: "Worse than both" })] }), _jsx("div", { className: "text-center mt-4", children: _jsx("button", { onClick: onClose, className: "text-slate-400 hover:text-slate-200 underline text-sm", children: "Skip this comparison (rank later)" }) })] }) }));
};
export var ComparisonSummaryModal = function (_a) {
    var isOpen = _a.isOpen, onClose = _a.onClose, rankedItem = _a.rankedItem, totalInBucket = _a.totalInBucket;
    return (_jsx(Modal, { isOpen: isOpen, onClose: onClose, title: "Ranking Complete!", size: "md", children: _jsxs("div", { className: "text-center p-4", children: [_jsx(PosterImage, { posterPath: rankedItem.posterPath, altText: rankedItem.title, className: "w-32 h-48 mx-auto rounded-md shadow-lg mb-4" }), _jsx("h3", { className: "text-xl font-semibold ".concat(ACCENT_TEXT_COLOR, " mb-1"), children: rankedItem.title }), _jsxs("p", { className: "text-slate-300 mb-1", children: ["Your Reaction: ", _jsxs("span", { className: "font-semibold", children: [REACTION_LABELS[rankedItem.reaction], " ", REACTION_EMOJIS[rankedItem.reaction]] })] }), _jsxs("p", { className: "text-slate-300 mb-1", children: ["Your Rank: ", _jsx("span", { className: "font-semibold", children: rankedItem.rank }), " out of ", totalInBucket, " ", rankedItem.mediaType === 'movie' ? 'movies' : 'shows', " you've ", REACTION_LABELS[rankedItem.reaction].toLowerCase(), "."] }), _jsxs("p", { className: "text-2xl font-bold text-slate-100 my-3", children: ["Personal Score: ", _jsx("span", { className: ACCENT_TEXT_COLOR, children: rankedItem.personalScore.toFixed(1) }), " / 10.0"] }), rankedItem.notes && (_jsxs("p", { className: "text-sm text-slate-400 italic mt-2 border-t border-slate-700 pt-2", children: ["Your notes: \"", rankedItem.notes, "\""] })), _jsx("button", { onClick: onClose, className: "mt-6 w-full ".concat(ACCENT_BG_COLOR, " hover:bg-cyan-500 text-white font-semibold py-2 px-4 rounded-md transition-colors shadow-md hover:shadow-lg"), children: "Got it!" })] }) }));
};
export var SearchBar = function (_a) {
    var onSearchSubmit = _a.onSearchSubmit, onSuggestionClick = _a.onSuggestionClick, _b = _a.placeholder, placeholder = _b === void 0 ? "Search movies & TV shows..." : _b;
    var _c = useState(''), query = _c[0], setQuery = _c[1];
    var _d = useState([]), suggestions = _d[0], setSuggestions = _d[1];
    var _e = useState(false), isLoading = _e[0], setIsLoading = _e[1];
    var _f = useState(false), isFocused = _f[0], setIsFocused = _f[1];
    var debouncedQuery = useDebounce(query, 300);
    var navigate = useNavigate();
    var searchContainerRef = useRef(null);
    useEffect(function () {
        if (debouncedQuery && debouncedQuery.length > 2) {
            setIsLoading(true);
            tmdbService.searchMedia(debouncedQuery, 1)
                .then(function (data) {
                setSuggestions(data.results.slice(0, 7)); // Limit to 7 suggestions
            })
                .catch(function (err) {
                console.error("Error fetching search suggestions:", err);
                setSuggestions([]);
            })
                .finally(function () { return setIsLoading(false); });
        }
        else {
            setSuggestions([]);
        }
    }, [debouncedQuery]);
    var handleSubmit = function (e) {
        e === null || e === void 0 ? void 0 : e.preventDefault();
        if (query.trim()) {
            if (onSearchSubmit) {
                onSearchSubmit(query.trim());
            }
            else {
                // Default action: navigate to a search results page (to be created in App.tsx)
                navigate("/search/".concat(encodeURIComponent(query.trim())));
            }
            setSuggestions([]);
            setQuery(''); // Optionally clear query after submit
        }
    };
    var handleSuggestionClick = function (item) {
        var mediaTypeForLink;
        if (item.media_type) {
            mediaTypeForLink = item.media_type;
        }
        else if ('title' in item && item.title) { // It's a movie
            mediaTypeForLink = 'movie';
        }
        else if ('name' in item && item.name) { // It's a TV show
            mediaTypeForLink = 'tv';
        }
        else {
            // Fallback, though TMDB items from search should have media_type or be identifiable
            console.warn('Could not determine media type for navigation link, defaulting to movie', item);
            mediaTypeForLink = 'movie';
        }
        if (onSuggestionClick) {
            onSuggestionClick(item);
        }
        else {
            navigate("/media/".concat(mediaTypeForLink, "/").concat(item.id));
        }
        setQuery('');
        setSuggestions([]);
        setIsFocused(false);
    };
    // Close suggestions when clicking outside
    useEffect(function () {
        function handleClickOutside(event) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setIsFocused(false);
                setSuggestions([]);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return function () {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [searchContainerRef]);
    return (_jsxs("div", { className: "relative w-full max-w-xl mx-auto", ref: searchContainerRef, children: [_jsxs("form", { onSubmit: handleSubmit, className: "flex items-center bg-slate-800 rounded-full shadow-md pr-2", children: [_jsx("input", { type: "text", value: query, onChange: function (e) { return setQuery(e.target.value); }, onFocus: function () { return setIsFocused(true); }, placeholder: placeholder, className: "w-full py-2.5 px-5 bg-transparent rounded-full text-slate-100 placeholder-slate-500 focus:outline-none" }), _jsx("button", { type: "submit", className: "p-2 rounded-full ".concat(ACCENT_BG_COLOR, " hover:bg-cyan-500 transition-colors"), children: _jsx(SearchIcon, { size: 20, className: "text-white" }) })] }), isFocused && (isLoading || suggestions.length > 0) && (_jsxs("div", { className: "absolute top-full mt-2 w-full bg-slate-800 rounded-md shadow-xl z-20 overflow-hidden border border-slate-700", children: [isLoading && !suggestions.length && (_jsx("div", { className: "p-3 text-slate-400 text-sm", children: "Loading suggestions..." })), _jsxs("ul", { className: "max-h-80 overflow-y-auto custom-scrollbar", children: [suggestions.map(function (item) {
                                var title;
                                var releaseDate;
                                var determinedMediaType;
                                // Prioritize media_type if available and valid, then check specific properties
                                if (item.media_type === 'movie' && 'title' in item && item.title) {
                                    title = item.title;
                                    releaseDate = item.release_date;
                                    determinedMediaType = 'movie';
                                }
                                else if (item.media_type === 'tv' && 'name' in item && item.name) {
                                    title = item.name;
                                    releaseDate = item.first_air_date;
                                    determinedMediaType = 'tv';
                                }
                                // Fallback to checking properties if media_type is missing or inconsistent
                                else if ('title' in item && item.title) { // Check for movie properties
                                    title = item.title;
                                    releaseDate = item.release_date;
                                    determinedMediaType = 'movie';
                                }
                                else if ('name' in item && item.name) { // Check for TV show properties
                                    title = item.name;
                                    releaseDate = item.first_air_date;
                                    determinedMediaType = 'tv';
                                }
                                else {
                                    // This case should ideally not be hit if TMDB data is consistent and types are correct.
                                    // If it is hit, it means the item is neither a movie nor a show by its properties.
                                    console.warn("Unknown media item type in suggestions:", item);
                                    title = item.original_title || item.original_name || 'Unknown Item';
                                    releaseDate = item.release_date || item.first_air_date;
                                    determinedMediaType = 'movie'; // Default or consider filtering out such items earlier
                                }
                                var year = releaseDate ? new Date(releaseDate).getFullYear().toString() : 'N/A';
                                return (_jsx("li", { onClick: function () { return handleSuggestionClick(item); }, className: "px-4 py-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 last:border-b-0 transition-colors duration-150 ease-in-out", children: _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(PosterImage, { posterPath: item.poster_path, altText: title || 'Media Poster', className: "w-10 h-14 rounded object-cover flex-shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-slate-100", children: title }), _jsxs("p", { className: "text-xs text-slate-400", children: [year, " - ", _jsx("span", { className: "capitalize ".concat(determinedMediaType === 'movie' ? 'text-blue-400' : 'text-teal-400'), children: determinedMediaType })] })] })] }) }, item.id + '-' + determinedMediaType));
                            }), !isLoading && debouncedQuery && suggestions.length === 0 && query.length > 2 && (_jsxs("div", { className: "p-3 text-slate-400 text-sm", children: ["No suggestions found for \"", debouncedQuery, "\"."] }))] })] }))] }));
};
var PersonCard = function (_a) {
    var photoPath = _a.photoPath, name = _a.name, roleOrDepartment = _a.roleOrDepartment, onClick = _a.onClick, _b = _a.size, size = _b === void 0 ? 'md' : _b;
    var imageUrl = tmdbService.getImageUrl(photoPath, 'w500');
    var placeholderSize = size === 'sm' ? 'w-16 h-16' : 'w-20 h-20';
    var imageSize = size === 'sm' ? 'w-16 h-16' : 'w-20 h-20';
    var textSize = size === 'sm' ? 'text-xs' : 'text-sm';
    var nameTextSize = size === 'sm' ? 'text-sm' : 'text-base';
    return (_jsxs("div", { className: "flex flex-col items-center text-center p-2 rounded-lg ".concat(onClick ? 'cursor-pointer hover:bg-slate-700/50' : '', " transition-colors"), onClick: onClick, role: onClick ? "button" : undefined, tabIndex: onClick ? 0 : undefined, onKeyDown: function (e) { return onClick && (e.key === 'Enter' || e.key === ' ') && onClick(); }, children: [imageUrl ? (_jsx("img", { src: imageUrl, alt: name, className: "".concat(imageSize, " rounded-full object-cover shadow-md mb-2"), loading: "lazy" })) : (_jsx("div", { className: "".concat(placeholderSize, " rounded-full bg-slate-700 flex items-center justify-center text-slate-500 mb-2 shadow-md"), children: _jsx(UserIcon, { size: size === 'sm' ? 24 : 32 }) })), _jsx("p", { className: "".concat(nameTextSize, " font-semibold text-slate-100 truncate w-full"), title: name, children: name }), _jsx("p", { className: "".concat(textSize, " text-slate-400 truncate w-full"), title: roleOrDepartment, children: roleOrDepartment })] }));
};
export var CastCard = function (_a) {
    var castMember = _a.castMember;
    var navigate = useNavigate();
    return (_jsx(PersonCard, { photoPath: castMember.profile_path, name: castMember.name, roleOrDepartment: castMember.character, onClick: function () { return navigate("/person/".concat(castMember.id)); } }));
};
export var CrewMemberDisplay = function (_a) {
    var crewMember = _a.crewMember, onClick = _a.onClick;
    var navigate = useNavigate();
    var handleClick = function () {
        if (onClick) {
            onClick();
        }
        else if (crewMember.id) {
            navigate("/person/".concat(crewMember.id));
        }
    };
    return (_jsxs("div", { className: "mb-1", children: [_jsx("span", { className: "font-semibold text-slate-200 ".concat(crewMember.id ? 'hover:text-cyan-400 cursor-pointer' : ''), onClick: handleClick, role: crewMember.id ? "link" : undefined, tabIndex: crewMember.id ? 0 : undefined, onKeyDown: function (e) { return crewMember.id && (e.key === 'Enter' || e.key === ' ') && handleClick(); }, children: crewMember.name }), _jsxs("span", { className: "text-slate-400 text-sm", children: [" (", crewMember.job, ")"] })] }));
};
export var EpisodeCard = function (_a) {
    var episode = _a.episode, showNumber = _a.showNumber, seasonNumber = _a.seasonNumber;
    var stillUrl = tmdbService.getImageUrl(episode.still_path, 'w500');
    return (_jsxs("div", { className: "bg-slate-800 rounded-lg shadow-md overflow-hidden flex flex-col md:flex-row", children: [stillUrl ? (_jsx("img", { src: stillUrl, alt: episode.name, className: "w-full md:w-48 h-auto md:h-28 object-cover", loading: "lazy" })) : (_jsx("div", { className: "w-full md:w-48 h-28 bg-slate-700 flex items-center justify-center text-slate-500", children: _jsx(TvIcon, { size: 32 }) })), _jsxs("div", { className: "p-3 flex-grow", children: [_jsxs("h4", { className: "text-md font-semibold text-slate-100", children: ["S", seasonNumber, " E", episode.episode_number, ": ", episode.name] }), episode.air_date && _jsxs("p", { className: "text-xs text-slate-400 mb-1", children: ["Air Date: ", new Date(episode.air_date).toLocaleDateString()] }), _jsx("p", { className: "text-sm text-slate-300 line-clamp-2", title: episode.overview || 'No overview available.', children: episode.overview || 'No overview available.' })] })] }));
};
export var WatchProviderDisplay = function (_a) {
    var _b, _c, _d, _e, _f, _g;
    var providers = _a.providers, _h = _a.region, region = _h === void 0 ? "US" : _h;
    if (!providers || (!((_b = providers.flatrate) === null || _b === void 0 ? void 0 : _b.length) && !((_c = providers.buy) === null || _c === void 0 ? void 0 : _c.length) && !((_d = providers.rent) === null || _d === void 0 ? void 0 : _d.length))) {
        return _jsx("p", { className: "text-sm text-slate-400", children: "No watch information available for your region." });
    }
    var renderProviderList = function (list, type) {
        if (!list || list.length === 0)
            return null;
        return (_jsxs("div", { className: "mb-3", children: [_jsxs("h4", { className: "text-sm font-semibold text-slate-300 mb-1 capitalize", children: [type, ":"] }), _jsx("div", { className: "flex flex-wrap gap-2", children: list.slice(0, 5).map(function (p) { return (_jsxs("a", { href: providers.link, target: "_blank", rel: "noopener noreferrer", title: "Watch on ".concat(p.provider_name), className: "flex items-center space-x-1.5 bg-slate-700 hover:bg-slate-600/70 p-1.5 rounded transition-colors shadow", children: [p.logo_path ? (_jsx("img", { src: tmdbService.getImageUrl(p.logo_path, 'w500'), alt: p.provider_name, className: "w-6 h-6 rounded-sm object-contain" })) : (_jsx(FilIcon, { size: 16, className: "text-slate-400" })), _jsx("span", { className: "text-xs text-slate-200 group-hover:text-cyan-300", children: p.provider_name })] }, p.provider_id)); }) })] }));
    };
    return (_jsxs("div", { className: "mt-4 p-3 bg-slate-800/50 rounded-md", children: [_jsxs("h3", { className: "text-md font-semibold text-slate-100 mb-2 flex items-center", children: [_jsx(TvIcon, { size: 20, className: "mr-2 ${ACCENT_TEXT_COLOR}" }), " Where to Watch (", region, ")", _jsxs("a", { href: providers.link, target: "_blank", rel: "noopener noreferrer", className: "ml-2 text-xs text-cyan-400 hover:underline", children: ["(via TMDB ", _jsx(ExternalLinkIcon, { size: 12, className: "inline" }), ")"] })] }), renderProviderList(providers.flatrate, 'Stream'), renderProviderList(providers.rent, 'Rent'), renderProviderList(providers.buy, 'Buy'), (!((_e = providers.flatrate) === null || _e === void 0 ? void 0 : _e.length) && !((_f = providers.buy) === null || _f === void 0 ? void 0 : _f.length) && !((_g = providers.rent) === null || _g === void 0 ? void 0 : _g.length)) && (_jsx("p", { className: "text-sm text-slate-500", children: "Specific provider data may not be available." }))] }));
};
export var CustomListItemCard = function (_a) {
    var list = _a.list, itemCount = _a.itemCount, onSelectList = _a.onSelectList, onDeleteList = _a.onDeleteList;
    var count = itemCount !== undefined ? itemCount : list.items.length;
    var navigate = useNavigate();
    var handleView = function () {
        navigate("/list/".concat(list.id));
    };
    return (_jsxs("div", { className: "bg-slate-800 p-4 rounded-lg shadow-md hover:shadow-cyan-500/20 transition-shadow flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h3", { onClick: handleView, className: "text-lg font-semibold ".concat(ACCENT_TEXT_COLOR, " hover:underline cursor-pointer"), children: list.name }), _jsx("p", { className: "text-sm text-slate-400 truncate max-w-md", children: list.description || 'No description.' }), _jsxs("p", { className: "text-xs text-slate-500 mt-1", children: [count, " item", count === 1 ? '' : 's', " - Last updated: ", new Date(list.updatedAt).toLocaleDateString()] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("button", { onClick: handleView, className: "p-2 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-200 hover:text-white transition-colors", title: "View List", children: _jsx(EyeIcon, { size: 20 }) }), onSelectList && (_jsx("button", { onClick: function () { return onSelectList(list); }, className: "p-2 ".concat(ACCENT_BG_COLOR, " hover:bg-cyan-500 text-white rounded-md transition-colors"), title: "Select this list (e.g. to add item)", children: _jsx(CheckIcon, { size: 20 }) })), onDeleteList && (_jsx("button", { onClick: function (e) { e.stopPropagation(); onDeleteList(list.id); }, className: "p-2 bg-red-700 hover:bg-red-600 text-white rounded-md transition-colors", title: "Delete List", children: _jsx(TrashIcon, { size: 20 }) }))] })] }));
};
export var CreateListModal = function (_a) {
    var isOpen = _a.isOpen, onClose = _a.onClose, onCreateList = _a.onCreateList;
    var _b = useState(''), name = _b[0], setName = _b[1];
    var _c = useState(''), description = _c[0], setDescription = _c[1];
    var handleSubmit = function () {
        if (name.trim()) {
            onCreateList(name.trim(), description.trim());
            setName('');
            setDescription('');
            onClose();
        }
    };
    return (_jsx(Modal, { isOpen: isOpen, onClose: onClose, title: "Create New List", children: _jsxs("div", { className: "space-y-4", children: [_jsx("input", { type: "text", placeholder: "List Name (e.g., Favorite Sci-Fi)", value: name, onChange: function (e) { return setName(e.target.value); }, className: "w-full p-2 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors text-slate-200 placeholder-slate-400" }), _jsx("textarea", { placeholder: "List Description (optional)", value: description, onChange: function (e) { return setDescription(e.target.value); }, rows: 3, className: "w-full p-2 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors text-slate-200 placeholder-slate-400 custom-scrollbar" }), _jsx("button", { onClick: handleSubmit, disabled: !name.trim(), className: "w-full ".concat(ACCENT_BG_COLOR, " hover:bg-cyan-500 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"), children: "Create List" })] }) }));
};
export var AddToListModal = function (_a) {
    var isOpen = _a.isOpen, onClose = _a.onClose, mediaItem = _a.mediaItem, customLists = _a.customLists, onAddToList = _a.onAddToList, onCreateNewListRequest = _a.onCreateNewListRequest;
    if (!isOpen)
        return null;
    return (_jsx(Modal, { isOpen: isOpen, onClose: onClose, title: "Add \"".concat(mediaItem.title, "\" to a list"), size: "md", children: customLists.length === 0 ? (_jsxs("div", { className: "text-center p-4", children: [_jsx("p", { className: "text-slate-300 mb-4", children: "You don't have any custom lists yet." }), _jsx("button", { onClick: function () { onCreateNewListRequest(); onClose(); }, className: "w-full ".concat(ACCENT_BG_COLOR, " hover:bg-cyan-500 text-white font-semibold py-2 px-4 rounded-md transition-colors"), children: "Create a New List" })] })) : (_jsxs("div", { className: "space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1", children: [customLists.map(function (list) {
                    var alreadyInList = list.items.some(function (i) { return i.tmdbId === mediaItem.tmdbId && i.mediaType === mediaItem.mediaType; });
                    return (_jsxs("button", { onClick: function () { if (!alreadyInList)
                            onAddToList(list.id, mediaItem); onClose(); }, disabled: alreadyInList, className: "w-full text-left p-3 rounded-md transition-colors flex justify-between items-center \n                                            ".concat(alreadyInList
                            ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'), children: [_jsxs("span", { children: [list.name, " ", _jsxs("span", { className: "text-xs text-slate-500", children: ["(", list.items.length, " items)"] })] }), alreadyInList && _jsx(CheckIcon, { size: 20, className: "text-green-400" })] }, list.id));
                }), _jsxs("button", { onClick: function () { onCreateNewListRequest(); onClose(); }, className: "mt-4 w-full border-2 ".concat(ACCENT_BORDER_COLOR, " ").concat(ACCENT_TEXT_COLOR, " hover:bg-cyan-500/10 font-semibold py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"), children: [_jsx(PlusIcon, { size: 20 }), _jsx("span", { children: "Create New List" })] })] })) }));
};
export var FeedCard = function (_a) {
    var item = _a.item;
    var navigate = useNavigate();
    var renderContent = function () {
        switch (item.type) {
            case 'rating':
                if (!item.mediaItem)
                    return null;
                return (_jsxs("p", { className: "text-slate-300", children: ["rated ", _jsx(Link, { to: "/media/".concat(item.mediaItem.mediaType, "/").concat(item.mediaItem.tmdbId), className: "font-semibold ".concat(ACCENT_TEXT_COLOR, " hover:underline"), children: item.mediaItem.title }), item.reaction && _jsx("span", { className: "ml-1", children: REACTION_EMOJIS[item.reaction] }), item.comment && _jsxs("span", { className: "block text-sm text-slate-400 italic mt-1", children: ["\"", item.comment, "\""] })] }));
            case 'list_create':
                return (_jsxs("p", { className: "text-slate-300", children: ["created a new list: ", _jsx(Link, { to: "/list/".concat(item.listId), className: "font-semibold ".concat(ACCENT_TEXT_COLOR, " hover:underline"), children: item.listName })] }));
            case 'list_update':
                return (_jsxs("p", { className: "text-slate-300", children: ["updated list: ", _jsx(Link, { to: "/list/".concat(item.listId), className: "font-semibold ".concat(ACCENT_TEXT_COLOR, " hover:underline"), children: item.listName }), item.comment && _jsxs("span", { className: "block text-sm text-slate-400 italic mt-1", children: ["\"", item.comment, "\""] })] }));
            default:
                return null;
        }
    };
    return (_jsxs("div", { className: "bg-slate-800 p-4 rounded-lg shadow-md", children: [_jsxs("div", { className: "flex items-center mb-2", children: [item.user.avatarUrl ? (_jsx("img", { src: item.user.avatarUrl, alt: item.user.handle, className: "w-8 h-8 rounded-full mr-2" })) : (_jsx("div", { className: "w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 font-semibold text-sm mr-2", children: item.user.handle.substring(0, 1).toUpperCase() })), _jsx("span", { className: "text-slate-200 font-semibold text-sm hover:underline cursor-pointer", onClick: function () { return navigate("/profile/".concat(item.user.id)); }, children: item.user.handle }), _jsxs("span", { className: "text-slate-500 text-xs ml-auto", children: [new Date(item.timestamp).toLocaleTimeString(), " - ", new Date(item.timestamp).toLocaleDateString()] })] }), renderContent()] }));
};
