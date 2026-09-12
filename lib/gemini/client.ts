import 'server-only';
import { GoogleGenAI } from '@google/genai';
import { env } from '@/lib/env';

/**
 * Gemini 클라이언트 싱글턴.
 *
 * R2: lib/env.ts 와 이 파일만이 API 키에 닿는다.
 *     'server-only' 때문에 클라이언트 번들에 섞이면 빌드가 실패한다.
 */
let cached: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!env.geminiApiKey) {
    throw new Error('GEMINI_API_KEY 가 설정되지 않았습니다.');
  }
  if (!cached) {
    cached = new GoogleGenAI({ apiKey: env.geminiApiKey });
  }
  return cached;
}
