import { supabase } from './supabaseClient';
import { WatchlistItem, RatedItem, Reaction } from './types';
import { calculatePersonalScore } from './services';
import { User } from '@supabase/supabase-js';

/*
 * Utility functions that persist watch- and seen-lists to Supabase for
 * account-level storage. Each row also stores the full TMDB item inside
 * `extra_json` so we don't need an extra round-trip when displaying the list.
 *
 * SQL tables expected (run these once in the Supabase SQL editor):
 * --------------------------------------------------------------
 * create table public.watchlist (
 *   id uuid default uuid_generate_v4() primary key,
 *   user_id uuid references auth.users on delete cascade,
 *   tmdb_id bigint not null,
 *   media_type text not null,
 *   added_at timestamptz default now(),
 *   extra_json jsonb
 * );
 *
 * create table public.seenlist (
 *   id uuid default uuid_generate_v4() primary key,
 *   user_id uuid references auth.users on delete cascade,
 *   tmdb_id bigint not null,
 *   media_type text not null,
 *   reaction text not null,
 *   rank_in_bucket int not null,
 *   personal_score numeric(4,1) not null,
 *   rated_at timestamptz default now(),
 *   user_notes text,
 *   extra_json jsonb
 * );
 *
 * -- RLS (each user reads/writes their own rows)
 * alter table public.watchlist enable row level security;
 * create policy "User watchlist" on public.watchlist
 *   using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );
 *
 * alter table public.seenlist enable row level security;
 * create policy "User seenlist" on public.seenlist
 *   using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );
 */

export const remoteListService = {
  /* ------------------- WATCHLIST ------------------- */
  async getWatchlist(user: User): Promise<WatchlistItem[]> {
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });
    if (error) throw error;
    return (data as any[]).map((row) => row.extra_json as WatchlistItem);
  },

  async addToWatchlist(user: User, item: WatchlistItem) {
    const { error } = await supabase.from('watchlist').upsert({
      user_id: user.id,
      tmdb_id: item.id,
      media_type: item.media_type,
      extra_json: item,
    });
    if (error) throw error;
  },

  async removeFromWatchlist(user: User, itemId: number, itemType: 'movie' | 'tv') {
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('tmdb_id', itemId)
      .eq('media_type', itemType);
    if (error) throw error;
  },

  /* --------------------- SEEN ---------------------- */
  async getSeenList(user: User): Promise<RatedItem[]> {
    const { data, error } = await supabase
      .from('seenlist')
      .select('*')
      .eq('user_id', user.id)
      .order('reaction')
      .order('rank_in_bucket');
    if (error) throw error;
    return (data as any[]).map((row) => row.extra_json as RatedItem);
  },

  async upsertRatedItem(user: User, item: RatedItem, rankInBucket: number, totalItemsInBucket: number) {
    const personalScore = calculatePersonalScore(rankInBucket, totalItemsInBucket, item.userReaction as Reaction);
    const { error } = await supabase.from('seenlist').upsert({
      user_id: user.id,
      tmdb_id: item.id,
      media_type: item.media_type,
      reaction: item.userReaction,
      rank_in_bucket: rankInBucket,
      personal_score: personalScore,
      user_notes: item.userNotes ?? null,
      extra_json: item,
    });
    if (error) throw error;
  },

  async removeFromSeenList(user: User, itemId: number, itemType: 'movie' | 'tv') {
    const { error } = await supabase
      .from('seenlist')
      .delete()
      .eq('user_id', user.id)
      .eq('tmdb_id', itemId)
      .eq('media_type', itemType);
    if (error) throw error;
  },
}; 