import { supabase } from './supabaseClient';
import { Reaction } from './types';

type MediaType = 'movie' | 'tv';

export type EventType =
  | 'rating_created'
  | 'rating_updated'
  | 'list_item_added'
  | 'list_item_removed'
  | 'list_created'
  | 'list_deleted'
  | 'follow'
  | 'unfollow'
  | 'media_opened'
  | 'search_performed'
  | 'comparison_prompt_shown'
  | 'comparison_choice';

export interface EventInsert {
  user_id: string;
  event_type: EventType;
  media_id?: number;
  media_type?: MediaType;
  list_id?: string;
  reaction?: Reaction;
  rating_stars?: number;
  rank_position?: number;
  search_query?: string;
  extra?: Record<string, unknown>;
  created_at?: string;
}

// Simple client-side batch queue with 500 ms debounce
const queue: EventInsert[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  if (queue.length === 0) return;
  const batch = [...queue];
  queue.length = 0;
  try {
    await supabase.from('events').insert(batch);
  } catch (err) {
    console.error('Failed to send event batch', err);
    // put back in queue for next attempt
    queue.unshift(...batch);
  }
}

export const eventService = {
  track(event: Omit<EventInsert, 'created_at'>) {
    queue.push({ ...event, created_at: new Date().toISOString() });
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        flush();
      }, 500);
    }
  },
}; 