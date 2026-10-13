import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

import { generateShareId } from './shareId';
import type { SharedPayload } from './types';
import { validatePayload } from './validate';

const SHARE_BASE_URL = 'https://u-stat.app/s';
// PostgREST's `.single()` error when no row matches the requested ID.
const NO_MATCHING_ROW_CODE = 'PGRST116';
// postgrest-js reports a request that never reached the server with status 0.
const NETWORK_FAILURE_STATUS = 0;
const PAYLOAD_TOO_LARGE_STATUS = 413;
// Postgres check violation, raised by the `shared_payloads.payload_size_limit` constraint.
const CHECK_VIOLATION_CODE = '23514';
const PAYLOAD_SIZE_CONSTRAINT = 'payload_size_limit';

/** The share ID has no stored payload: the link was deleted, expired, or mistyped. */
export class SharePayloadNotFoundError extends Error {
  constructor(id: string) {
    super(`Shared payload not found: ${id}`);
    this.name = 'SharePayloadNotFoundError';
  }
}

export type ShareUploadFailureReason = 'network' | 'too-large' | 'server';

/** Storage refused or never received the upload; `reason` drives the user-facing message. */
export class ShareUploadError extends Error {
  readonly reason: ShareUploadFailureReason;
  readonly status: number;
  readonly code: string;
  /** Serialized JSON length in characters, for diagnosing size-related failures. */
  readonly payloadLength: number;

  constructor(
    message: string,
    details: {
      reason: ShareUploadFailureReason;
      status: number;
      code: string;
      payloadLength: number;
    },
  ) {
    super(`Failed to upload shared payload: ${message}`);
    this.name = 'ShareUploadError';
    this.reason = details.reason;
    this.status = details.status;
    this.code = details.code;
    this.payloadLength = details.payloadLength;
  }
}

function getUploadFailureReason(error: PostgrestError, status: number): ShareUploadFailureReason {
  if (status === NETWORK_FAILURE_STATUS) return 'network';
  const exceedsSizeConstraint =
    error.code === CHECK_VIOLATION_CODE && error.message.includes(PAYLOAD_SIZE_CONSTRAINT);
  if (status === PAYLOAD_TOO_LARGE_STATUS || exceedsSizeConstraint) return 'too-large';
  return 'server';
}

interface UploadResult {
  url: string;
  id: string;
}

/**
 * Uploads a payload after checking it against the import rules, so a share that the recipient
 * could never import fails here with an `InvalidSharePayloadError` instead.
 */
export async function uploadPayload(payload: SharedPayload): Promise<UploadResult> {
  const validatedPayload = validatePayload(payload);

  const id = generateShareId();
  const { error, status } = await supabase.from('shared_payloads').insert({
    id,
    type: validatedPayload.type,
    payload: validatedPayload,
  });

  if (error) {
    throw new ShareUploadError(error.message, {
      reason: getUploadFailureReason(error, status),
      status,
      code: error.code,
      payloadLength: JSON.stringify(validatedPayload).length,
    });
  }

  return { url: `${SHARE_BASE_URL}/${validatedPayload.type}/${id}`, id };
}

export async function fetchPayload(id: string): Promise<SharedPayload> {
  const { data, error } = await supabase
    .from('shared_payloads')
    .select('payload')
    .eq('id', id)
    .single();

  if (error?.code === NO_MATCHING_ROW_CODE) {
    throw new SharePayloadNotFoundError(id);
  }
  if (error) {
    throw new Error(`Failed to fetch shared payload: ${error.message}`);
  }

  return validatePayload(data.payload);
}
