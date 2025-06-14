import { FeedItem } from './types';
import { DEFAULT_USER_ID } from './constants';
import { userService } from './userService';
import { mockFeedItems } from './mockData';

const FEED_KEY = 'feed_items';

const getFromStorage = <T,>(key: string, fallback: T): T => {
    const raw = localStorage.getItem(key);
    try {
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
};

const saveToStorage = <T,>(key: string, value: T) => {
    localStorage.setItem(key, JSON.stringify(value));
};

export const feedService = {
    getAll(): FeedItem[] {
        return getFromStorage<FeedItem[]>(FEED_KEY, mockFeedItems);
    },

    saveAll(items: FeedItem[]) {
        saveToStorage(FEED_KEY, items);
    },

    add(item: FeedItem) {
        const items = this.getAll();
        items.unshift(item);
        this.saveAll(items);
    },

    getFeedForUser(userId: string = DEFAULT_USER_ID): FeedItem[] {
        const followingIds = userService.getFollowing(userId).map((u) => u.id);
        return this.getAll().filter((f) => f.user.id === userId || followingIds.includes(f.user.id));
    },
}; 