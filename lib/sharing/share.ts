import { supabase } from '@/lib/supabase';
import { generateShareId } from './shareId';
import type { SharedPayload } from './types';
import { validatePayload } from './validate';

const SHARE_BASE_URL = 'https://u-stat.app/s';

interface UploadResult {
  url: string;
  id: string;
}

export async function uploadPayload(payload: SharedPayload): Promise<UploadResult> {
  const id = generateShareId();

  const { error } = await supabase.from('shared_payloads').insert({
    id,
    type: payload.type,
    payload,
  });

  if (error) {
    throw new Error(`Failed to upload shared payload: ${error.message}`);
  }

  return { url: `${SHARE_BASE_URL}/${payload.type}/${id}`, id };
}

export async function fetchPayload(id: string): Promise<SharedPayload> {
  const { data, error } = await supabase
    .from('shared_payloads')
    .select('payload')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch shared payload: ${error.message}`);
  }

  return validatePayload(data.payload);
}
