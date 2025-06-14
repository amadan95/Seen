import { User, Follow } from './types';
import { DEFAULT_USER_ID } from './constants';

// ----- LocalStorage helpers -----
const USERS_KEY = 'users';
const FOLLOWS_KEY = 'follows';

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

// ----- Service implementation -----
export const userService = {
    // Users --------------------------------------------------------------
    getAllUsers(): User[] {
        return getFromStorage<User[]>(USERS_KEY, []);
    },

    saveAllUsers(users: User[]) {
        saveToStorage(USERS_KEY, users);
    },

    ensureUser(user: User) {
        const users = this.getAllUsers();
        if (!users.find((u) => u.id === user.id)) {
            users.push(user);
            this.saveAllUsers(users);
        }
        return user;
    },

    searchUsers(query: string): User[] {
        const q = query.toLowerCase();
        return this.getAllUsers().filter((u) => u.handle.toLowerCase().includes(q));
    },

    // Follow relationships ---------------------------------------------
    getAllFollows(): Follow[] {
        return getFromStorage<Follow[]>(FOLLOWS_KEY, []);
    },

    saveAllFollows(follows: Follow[]) {
        saveToStorage(FOLLOWS_KEY, follows);
    },

    isFollowing(targetId: string, followerId: string = DEFAULT_USER_ID): boolean {
        return this.getAllFollows().some((f) => f.followerId === followerId && f.followingId === targetId);
    },

    followUser(targetId: string, followerId: string = DEFAULT_USER_ID) {
        if (this.isFollowing(targetId, followerId) || targetId === followerId) return;
        const follows = this.getAllFollows();
        follows.push({ followerId, followingId: targetId, createdAt: new Date().toISOString() });
        this.saveAllFollows(follows);
    },

    unfollowUser(targetId: string, followerId: string = DEFAULT_USER_ID) {
        const follows = this.getAllFollows().filter((f) => !(f.followerId === followerId && f.followingId === targetId));
        this.saveAllFollows(follows);
    },

    getFollowers(userId: string): User[] {
        const followerIds = this.getAllFollows().filter((f) => f.followingId === userId).map((f) => f.followerId);
        return this.getAllUsers().filter((u) => followerIds.includes(u.id));
    },

    getFollowing(userId: string): User[] {
        const followingIds = this.getAllFollows().filter((f) => f.followerId === userId).map((f) => f.followingId);
        return this.getAllUsers().filter((u) => followingIds.includes(u.id));
    },

    getFollowerCount(userId: string): number {
        return this.getAllFollows().filter((f) => f.followingId === userId).length;
    },

    getFollowingCount(userId: string): number {
        return this.getAllFollows().filter((f) => f.followerId === userId).length;
    },
}; 