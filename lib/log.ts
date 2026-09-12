import { redact } from '@/lib/env';

/**
 * 구조화 로그.
 *
 * R2: 어떤 경로로도 API 키가 로그에 남지 않도록 직렬화 결과를 한 번 더 거른다.
 */
type Fields = Record<string, unknown>;

function emit(level: 'info' | 'error', event: string, fields: Fields): void {
  let payload: string;
  try {
    payload = JSON.stringify({ level, event, ts: new Date().toISOString(), ...fields });
  } catch {
    payload = JSON.stringify({ level, event, ts: new Date().toISOString(), note: 'unserializable' });
  }
  const safe = redact(payload);
  if (level === 'error') console.error(safe);
  else console.log(safe);
}

export const logInfo = (event: string, fields: Fields = {}) => emit('info', event, fields);
export const logError = (event: string, fields: Fields = {}) => emit('error', event, fields);
