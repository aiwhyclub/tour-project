import type { ApiErrorCode } from '@/lib/errors';
import type { ItineraryPlan } from '@/types/itinerary';

export interface ResponseMeta {
  requestId: string;
  latencyMs: number;
  source: 'gemini' | 'mock';
}

export interface PlanSuccessResponse {
  ok: true;
  data: ItineraryPlan;
  meta: ResponseMeta;
}

export interface PlanErrorBody {
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
  /** VALIDATION_FAILED 일 때만 채워진다 */
  fields: Record<string, string> | null;
}

export interface PlanErrorResponse {
  ok: false;
  error: PlanErrorBody;
  meta: ResponseMeta;
}

export type PlanResponse = PlanSuccessResponse | PlanErrorResponse;
