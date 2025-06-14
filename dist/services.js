var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { TMDB_API_KEY, TMDB_BASE_URL, TMDB_IMAGE_BASE_URL_W500, TMDB_IMAGE_BASE_URL_ORIGINAL, GEMINI_TEXT_MODEL, DEFAULT_USER_ID } from './constants';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
// Helper to construct API URLs
var buildTmdbUrl = function (endpoint, params) {
    if (params === void 0) { params = {}; }
    var url = new URL("".concat(TMDB_BASE_URL).concat(endpoint));
    url.searchParams.append('api_key', TMDB_API_KEY);
    Object.entries(params).forEach(function (_a) {
        var key = _a[0], value = _a[1];
        return url.searchParams.append(key, String(value));
    });
    return url.toString();
};
// Generic fetch function for TMDB API
function fetchTmdb(endpoint_1) {
    return __awaiter(this, arguments, void 0, function (endpoint, params) {
        var url, response, errorData, error_1;
        if (params === void 0) { params = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = buildTmdbUrl(endpoint, params);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, fetch(url)];
                case 2:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json().catch(function () { return ({}); })];
                case 3:
                    errorData = _a.sent();
                    console.error("TMDB API Error: ".concat(response.status, " ").concat(response.statusText), errorData);
                    throw new Error("Failed to fetch data from TMDB: ".concat(response.status, " ").concat(response.statusText));
                case 4: return [2 /*return*/, response.json()];
                case 5:
                    error_1 = _a.sent();
                    console.error('Network or parsing error fetching from TMDB:', error_1);
                    throw error_1; // Re-throw to be handled by caller
                case 6: return [2 /*return*/];
            }
        });
    });
}
export var tmdbService = {
    getImageUrl: function (path, size) {
        if (size === void 0) { size = 'w500'; }
        if (!path)
            return null;
        return size === 'w500' ? "".concat(TMDB_IMAGE_BASE_URL_W500).concat(path) : "".concat(TMDB_IMAGE_BASE_URL_ORIGINAL).concat(path);
    },
    prepareRatedItemProperties: function (item, mediaTypeOverride) {
        var mediaType = mediaTypeOverride || item.media_type || (item.title ? 'movie' : 'tv');
        var title = item.title || item.name || 'Untitled';
        var releaseDate = item.release_date || item.first_air_date;
        var releaseYear = releaseDate ? new Date(releaseDate).getFullYear().toString() : 'N/A';
        return {
            tmdbId: item.id,
            mediaType: mediaType,
            title: title,
            posterPath: item.poster_path,
            releaseYear: releaseYear,
            genres: item.genres, // Assumes genres are populated if available
        };
    },
    searchMedia: function (query_1) {
        var args_1 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args_1[_i - 1] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([query_1], args_1, true), void 0, function (query, page) {
            if (page === void 0) { page = 1; }
            return __generator(this, function (_a) {
                return [2 /*return*/, fetchTmdb('/search/multi', { query: query, page: page, include_adult: 'false' })];
            });
        });
    },
    getMediaDetails: function (id, mediaType) { return __awaiter(void 0, void 0, void 0, function () {
        var endpoint;
        return __generator(this, function (_a) {
            endpoint = "/".concat(mediaType, "/").concat(id);
            return [2 /*return*/, fetchTmdb(endpoint, { append_to_response: 'credits,watch/providers,videos' })];
        });
    }); },
    getTrendingMovies: function () {
        var args_1 = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args_1[_i] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (timeWindow, page) {
            if (timeWindow === void 0) { timeWindow = 'week'; }
            if (page === void 0) { page = 1; }
            return __generator(this, function (_a) {
                return [2 /*return*/, fetchTmdb("/trending/movie/".concat(timeWindow), { page: page })];
            });
        });
    },
    getTrendingShows: function () {
        var args_1 = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args_1[_i] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (timeWindow, page) {
            if (timeWindow === void 0) { timeWindow = 'week'; }
            if (page === void 0) { page = 1; }
            return __generator(this, function (_a) {
                return [2 /*return*/, fetchTmdb("/trending/tv/".concat(timeWindow), { page: page })];
            });
        });
    },
    getGenres: function (mediaType) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchTmdb("/genre/".concat(mediaType, "/list"))];
        });
    }); },
    getCredits: function (id, mediaType) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchTmdb("/".concat(mediaType, "/").concat(id, "/credits"))];
        });
    }); },
    getPersonDetails: function (personId) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchTmdb("/person/".concat(personId))];
        });
    }); },
    getPersonCombinedCredits: function (personId) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchTmdb("/person/".concat(personId, "/combined_credits"))];
        });
    }); },
    getWatchProviders: function (id, mediaType) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchTmdb("/".concat(mediaType, "/").concat(id, "/watch/providers"))];
        });
    }); },
    getSeasonDetails: function (tvId, seasonNumber) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchTmdb("/tv/".concat(tvId, "/season/").concat(seasonNumber))];
        });
    }); },
    discoverMedia: function (mediaType_1) {
        var args_1 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args_1[_i - 1] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([mediaType_1], args_1, true), void 0, function (mediaType, filters, page) {
            if (filters === void 0) { filters = {}; }
            if (page === void 0) { page = 1; }
            return __generator(this, function (_a) {
                return [2 /*return*/, fetchTmdb("/discover/".concat(mediaType), __assign(__assign({}, filters), { page: page, include_adult: 'false' }))];
            });
        });
    },
    getPopularMovies: function () {
        var args_1 = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args_1[_i] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (page) {
            if (page === void 0) { page = 1; }
            return __generator(this, function (_a) {
                return [2 /*return*/, fetchTmdb('/movie/popular', { page: page })];
            });
        });
    },
    getPopularShows: function () {
        var args_1 = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args_1[_i] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (page) {
            if (page === void 0) { page = 1; }
            return __generator(this, function (_a) {
                return [2 /*return*/, fetchTmdb('/tv/popular', { page: page })];
            });
        });
    },
};
// geminiService and userListService will be added below
// **** GEMINI SERVICE ****
var genAI = null;
var initializeGenAI = function () {
    if (!genAI) {
        try {
            var apiKey = process.env.API_KEY;
            if (!apiKey) {
                console.error("Gemini API Key not found. Make sure API_KEY environment variable is set.");
                throw new Error("Gemini API Key not found.");
            }
            genAI = new GoogleGenerativeAI(apiKey); // Pass API key directly as per documentation
        }
        catch (error) {
            console.error("Failed to initialize Gemini AI SDK:", error);
            // Allow the app to run without Gemini if key is missing, but log error
            // Features requiring Gemini will not work.
        }
    }
    return genAI;
};
export var geminiService = {
    generateComparisonPrompt: function (item1, item2, newItem) { return __awaiter(void 0, void 0, void 0, function () {
        var ai, model, prompt, result, response, text, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ai = initializeGenAI();
                    if (!ai) {
                        return [2 /*return*/, "Which do you prefer: ".concat(item1.title, " or ").concat(item2.title, "? (Considering ").concat(newItem.title, ")")];
                    }
                    model = ai.getGenerativeModel({
                        model: GEMINI_TEXT_MODEL,
                        // Pass config here for safety controls and other parameters
                        safetySettings: [
                            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                        ],
                        generationConfig: {
                            // The API documentation for @google/genai suggests configuration like temperature, topK, topP, maxOutputTokens
                            // go into generationConfig. The `thinkingConfig` seems to be a Cursor-specific or older API feature.
                            // For standard @google/genai, we set typical parameters.
                            // We want creative but controlled prompts, not overly random.
                            temperature: 0.7,
                            topK: 3,
                            topP: 1.0,
                            maxOutputTokens: 100,
                        }
                    });
                    prompt = "You are assisting a user in ranking their ".concat(newItem.mediaType, "s: \"").concat(newItem.title, "\". They need to decide its position relative to other items they've already rated similarly. \n\nCurrently, they are comparing these two ").concat(newItem.mediaType, "s:\n1. \"").concat(item1.title, "\" (").concat(item1.releaseYear, ")\n2. \"").concat(item2.title, "\" (").concat(item2.releaseYear, ")\n\nTo help them decide which of these two they prefer, or if \"").concat(newItem.title, "\" fits between them, generate a short, engaging, and creative question. The question should subtly guide them to think about their preference between \"").concat(item1.title, "\" and \"").concat(item2.title, "\" while keeping \"").concat(newItem.title, "\" in mind. Frame it as if asking the user directly.\n\nExample creative questions:\n- \"If you could only rewatch one on a rainy day, would it be ").concat(item1.title, " or ").concat(item2.title, "? And where would ").concat(newItem.title, " fit into that mood?\"\n- \"Which one sparked more debate with friends: ").concat(item1.title, " or ").concat(item2.title, "? Does ").concat(newItem.title, " remind you of either?\"\n- \"Considering their impact on you, does ").concat(item1.title, " resonate more deeply than ").concat(item2.title, ", or is it the other way around? How does ").concat(newItem.title, " compare in terms of personal impact?\"\n\nGenerate a new creative question:\n");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, model.generateContent(prompt)];
                case 2:
                    result = _a.sent();
                    response = result.response;
                    text = response.text();
                    return [2 /*return*/, text.trim() || "Which do you prefer: ".concat(item1.title, " or ").concat(item2.title, "?")];
                case 3:
                    error_2 = _a.sent();
                    console.error("Error generating comparison prompt with Gemini:", error_2);
                    // Fallback prompt
                    return [2 /*return*/, "Error generating prompt. Default: Which do you prefer: ".concat(item1.title, " or ").concat(item2.title, "? (Considering ").concat(newItem.title, ")")];
                case 4: return [2 /*return*/];
            }
        });
    }); },
};
// userListService will be added next
// **** USER LIST SERVICE ****
var getLocalStorageKey = function (key) { return "".concat(DEFAULT_USER_ID, "_").concat(key); };
var getFromLocalStorage = function (key, defaultValue) {
    try {
        var item = localStorage.getItem(getLocalStorageKey(key));
        return item ? JSON.parse(item) : defaultValue;
    }
    catch (error) {
        console.error("Error reading ".concat(key, " from localStorage:"), error);
        return defaultValue;
    }
};
var saveToLocalStorage = function (key, value) {
    try {
        localStorage.setItem(getLocalStorageKey(key), JSON.stringify(value));
    }
    catch (error) {
        console.error("Error saving ".concat(key, " to localStorage:"), error);
    }
};
// Helper to generate a simple UUID (for custom list IDs primarily)
var generateUUID = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
export var userListService = {
    // --- Seen List (Rated Items) ---
    getSeenList: function () { return getFromLocalStorage('seenList', []); },
    saveSeenList: function (list) { return saveToLocalStorage('seenList', list); },
    addRatedItem: function (item) {
        var list = userListService.getSeenList();
        var existingIndex = list.findIndex(function (i) { return i.tmdbId === item.tmdbId && i.mediaType === item.mediaType; });
        if (existingIndex > -1) {
            list[existingIndex] = item; // Update if exists
        }
        else {
            list.push(item);
        }
        userListService.saveSeenList(list);
        return list;
    },
    removeRatedItem: function (tmdbId, mediaType) {
        var list = userListService.getSeenList();
        list = list.filter(function (i) { return !(i.tmdbId === tmdbId && i.mediaType === mediaType); });
        userListService.saveSeenList(list);
        return list;
    },
    getRatedItem: function (tmdbId, mediaType) {
        return userListService.getSeenList().find(function (i) { return i.tmdbId === tmdbId && i.mediaType === mediaType; });
    },
    createRatedItem: function (mediaItem, reaction, notes) {
        return __assign(__assign({}, mediaItem), { reaction: reaction, notes: notes, ratedAt: new Date().toISOString() });
    },
    // --- Watchlist ---
    getWatchlist: function () { return getFromLocalStorage('watchlist', []); },
    saveWatchlist: function (list) { return saveToLocalStorage('watchlist', list); },
    addToWatchlist: function (item) {
        var list = userListService.getWatchlist();
        if (!list.find(function (i) { return i.tmdbId === item.tmdbId && i.mediaType === item.mediaType; })) {
            list.push(item);
            userListService.saveWatchlist(list);
        }
        return list;
    },
    removeFromWatchlist: function (tmdbId, mediaType) {
        var list = userListService.getWatchlist();
        list = list.filter(function (i) { return !(i.tmdbId === tmdbId && i.mediaType === mediaType); });
        userListService.saveWatchlist(list);
        return list;
    },
    isOnWatchlist: function (tmdbId, mediaType) {
        return !!userListService.getWatchlist().find(function (i) { return i.tmdbId === tmdbId && i.mediaType === mediaType; });
    },
    // --- Custom Lists ---
    getCustomLists: function () { return getFromLocalStorage('customLists', []); },
    saveCustomLists: function (lists) { return saveToLocalStorage('customLists', lists); },
    createCustomList: function (name, description) {
        var newList = {
            id: generateUUID(),
            name: name,
            description: description,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: [],
            itemOrder: [],
        };
        var lists = userListService.getCustomLists();
        lists.push(newList);
        userListService.saveCustomLists(lists);
        return newList;
    },
    getCustomListById: function (listId) {
        return userListService.getCustomLists().find(function (l) { return l.id === listId; });
    },
    updateCustomListDetails: function (listId, name, description) {
        var lists = userListService.getCustomLists();
        var listIndex = lists.findIndex(function (l) { return l.id === listId; });
        if (listIndex > -1) {
            lists[listIndex].name = name;
            lists[listIndex].description = description;
            lists[listIndex].updatedAt = new Date().toISOString();
            userListService.saveCustomLists(lists);
            return lists[listIndex];
        }
        return undefined;
    },
    deleteCustomList: function (listId) {
        var lists = userListService.getCustomLists();
        lists = lists.filter(function (l) { return l.id !== listId; });
        userListService.saveCustomLists(lists);
        return lists;
    },
    addItemToCustomList: function (listId, item) {
        var lists = userListService.getCustomLists();
        var listIndex = lists.findIndex(function (l) { return l.id === listId; });
        if (listIndex > -1) {
            var list = lists[listIndex];
            if (!list.items.find(function (i) { return i.tmdbId === item.tmdbId && i.mediaType === item.mediaType; })) {
                list.items.push(item);
                list.itemOrder.push(item.tmdbId); // Add to order
                list.updatedAt = new Date().toISOString();
                userListService.saveCustomLists(lists);
                return list;
            }
        }
        return undefined;
    },
    removeItemFromCustomList: function (listId, tmdbId, mediaType) {
        var lists = userListService.getCustomLists();
        var listIndex = lists.findIndex(function (l) { return l.id === listId; });
        if (listIndex > -1) {
            var list = lists[listIndex];
            list.items = list.items.filter(function (i) { return !(i.tmdbId === tmdbId && i.mediaType === mediaType); });
            list.itemOrder = list.itemOrder.filter(function (id) { return id !== tmdbId; }); // Remove from order
            list.updatedAt = new Date().toISOString();
            userListService.saveCustomLists(lists);
            return list;
        }
        return undefined;
    },
    reorderItemsInCustomList: function (listId, newItemOrder) {
        var lists = userListService.getCustomLists();
        var listIndex = lists.findIndex(function (l) { return l.id === listId; });
        if (listIndex > -1) {
            var list_1 = lists[listIndex];
            // Ensure all original items are still present in the new order
            var originalTmdbIds = new Set(list_1.items.map(function (i) { return i.tmdbId; }));
            var newTmdbIds_1 = new Set(newItemOrder);
            if (originalTmdbIds.size !== newTmdbIds_1.size || !Array.from(originalTmdbIds).every(function (id) { return newTmdbIds_1.has(id); })) {
                console.error("Reorder failed: New item order does not match original items.");
                return list_1; // Or throw an error
            }
            list_1.itemOrder = newItemOrder;
            // Re-sort items array based on new itemOrder
            list_1.items.sort(function (a, b) { return list_1.itemOrder.indexOf(a.tmdbId) - list_1.itemOrder.indexOf(b.tmdbId); });
            list_1.updatedAt = new Date().toISOString();
            userListService.saveCustomLists(lists);
            return list_1;
        }
        return undefined;
    },
    // --- Ranking and Scoring Logic ---
    // Stores ranks as { [tmdbId_mediaType]: rank }
    // This is a simplified approach; ranks are per reaction category and media type.
    // A more robust system might store this with the RatedItem or in a separate structure.
    // For now, we'll re-calculate ranks on the fly when displaying a ranked list.
    calculatePersonalScore: function (rank, totalItemsInBucket, reaction) {
        if (totalItemsInBucket === 0)
            return 0;
        if (totalItemsInBucket === 1) {
            if (reaction === "Liked")
                return 8.5;
            if (reaction === "Fine")
                return 5.0;
            if (reaction === "Disliked")
                return 2.5;
            return 0;
        }
        // Normalize rank from 0 (best) to 1 (worst)
        var normalizedRank = (rank - 1) / (totalItemsInBucket - 1);
        var baseScore, scoreRange;
        switch (reaction) {
            case "Liked": // Score 7.0 - 10.0
                baseScore = 7.0;
                scoreRange = 3.0;
                break;
            case "Fine": // Score 4.0 - 6.9
                baseScore = 4.0;
                scoreRange = 2.9;
                break;
            case "Disliked": // Score 0.0 - 3.9
                baseScore = 0.0;
                scoreRange = 3.9;
                break;
            default:
                return 0;
        }
        // Higher rank (lower number) means better score
        var score = baseScore + (1 - normalizedRank) * scoreRange;
        return parseFloat(Math.min(10.0, Math.max(0.0, score)).toFixed(1));
    },
    // This function will be responsible for taking a new item and a list of items
    // it needs to be compared against, and determining its final position (rank).
    // The actual pairwise comparison UI and Gemini calls are handled in App.tsx / components.
    // This service function just updates the list based on the resolved position.
    updateOrderAfterIteration: function (list, newItem, finalIndex // The index where the newItem should be inserted
    ) {
        var newList = list.filter(function (item) { return !(item.tmdbId === newItem.tmdbId && item.mediaType === newItem.mediaType); });
        newList.splice(finalIndex, 0, newItem);
        // Note: This function itself doesn't save to localStorage. That's done by callers
        // like addRatedItem or a dedicated ranking update function.
        return newList;
    },
    getRankedList: function (reaction, mediaType) {
        var seenList = userListService.getSeenList();
        var bucket = seenList
            .filter(function (item) { return item.reaction === reaction && item.mediaType === mediaType; })
            .sort(function (a, b) { return new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime(); }); // Default sort by newest, can be overridden by ranking
        // In a real ranking system, you'd sort by a persisted rank or order field here.
        // For this iterative system, the order *is* the rank.
        var totalInBucket = bucket.length;
        return bucket.map(function (item, index) {
            var rank = index + 1; // Rank is 1-based
            return __assign(__assign({}, item), { rank: rank, personalScore: userListService.calculatePersonalScore(rank, totalInBucket, reaction) });
        });
    },
    // Returns items of a specific reaction, sorted by their established rank (implicit by order)
    getRankedItemsByReaction: function (reaction) {
        var seenList = userListService.getSeenList();
        var moviesInReaction = seenList
            .filter(function (item) { return item.reaction === reaction && item.mediaType === 'movie'; });
        // Assuming items are already sorted by rank when added/updated by iterative comparison
        // If not, a dedicated sorting key for rank is needed.
        // For now, we assume the order in `seenList` reflects ranks within reaction/type.
        var showsInReaction = seenList
            .filter(function (item) { return item.reaction === reaction && item.mediaType === 'tv'; });
        var rankedMovies = moviesInReaction.map(function (item, index) { return (__assign(__assign({}, item), { rank: index + 1, personalScore: userListService.calculatePersonalScore(index + 1, moviesInReaction.length, reaction) })); });
        var rankedShows = showsInReaction.map(function (item, index) { return (__assign(__assign({}, item), { rank: index + 1, personalScore: userListService.calculatePersonalScore(index + 1, showsInReaction.length, reaction) })); });
        return __spreadArray(__spreadArray([], rankedMovies, true), rankedShows, true).sort(function (a, b) { return b.personalScore - a.personalScore; }); // Optionally sort combined by score
    },
    // --- Stats ---
    calculateWeeklyStreak: function () {
        var seenList = userListService.getSeenList();
        if (seenList.length === 0)
            return 0;
        var sortedRatings = seenList
            .map(function (item) { return new Date(item.ratedAt); })
            .sort(function (a, b) { return b.getTime() - a.getTime(); });
        var streak = 0;
        var currentWeek = new Date();
        currentWeek.setHours(0, 0, 0, 0);
        // Adjust currentWeek to be the Sunday of the current week
        currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay());
        var ratedDates = sortedRatings.map(function (date) {
            var d = new Date(date);
            d.setHours(0, 0, 0, 0);
            // Adjust to Sunday of that week
            d.setDate(d.getDate() - d.getDay());
            return d.getTime();
        });
        var uniqueWeeklyTimestamps = __spreadArray([], new Set(ratedDates), true);
        uniqueWeeklyTimestamps.sort(function (a, b) { return b - a; }); // Sort weeks descending
        if (uniqueWeeklyTimestamps.length === 0)
            return 0;
        // Check if latest rating is this week or last week
        var oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
        if (uniqueWeeklyTimestamps[0] < currentWeek.getTime() - oneWeekInMs) {
            return 0; // No ratings in current or previous week relative to today
        }
        for (var i = 0; i < uniqueWeeklyTimestamps.length; i++) {
            var weekTimestamp = uniqueWeeklyTimestamps[i];
            var expectedPreviousWeekTimestamp = currentWeek.getTime() - (streak * oneWeekInMs);
            if (weekTimestamp === expectedPreviousWeekTimestamp) {
                streak++;
            }
            else if (weekTimestamp < expectedPreviousWeekTimestamp - (oneWeekInMs / 2)) { // Allow for some leeway, effectively checking if it's *before* the expected previous week
                // Break if there's a gap: the rating is from an earlier week than expected
                break;
            }
            // If weekTimestamp is more recent than expectedPreviousWeekTimestamp but not current streak week, 
            // it might be that currentWeek was advanced too far, or multiple ratings in one week. Streak continues based on contiguous past weeks.
        }
        return streak;
    },
    getRuntimeCategory: function (runtime) {
        if (runtime === undefined || runtime === null)
            return 'N/A';
        if (runtime <= 30)
            return 'Short (<30m)';
        if (runtime <= 60)
            return 'Standard (30-60m)';
        if (runtime <= 120)
            return 'Feature (60-120m)';
        return 'Long (>120m)';
    },
};
