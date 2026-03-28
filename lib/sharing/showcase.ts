import type { SavedGame } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import type { ShowcaseGameMeta } from './showcaseTypes';
import type { SharedPayload } from './types';
import { validatePayload } from './validate';

export type ShowcasePayload = SharedPayload & { type: 'game'; data: SavedGame };

export async function fetchShowcaseList(): Promise<ShowcaseGameMeta[]> {
  const { data, error } = await supabase
    .from('showcase_games')
    .select('id, game_id, title, description, tags, created_at, import_count')
    .eq('is_published', true)
    .order('import_count', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch showcase games: ${error.message}`);
  }

  return data;
}

export async function fetchShowcasePayload(id: string): Promise<ShowcasePayload> {
  const { data, error } = await supabase
    .from('showcase_games')
    .select('payload')
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (error) {
    throw new Error(`Failed to fetch showcase payload: ${error.message}`);
  }

  return validatePayload(data.payload) as ShowcasePayload;
}

export function incrementShowcaseImportCount(id: string): void {
  supabase.rpc('increment_showcase_import_count', { p_id: id }).then(() => {});
}
