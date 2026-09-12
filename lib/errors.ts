/** API 오류 코드 — 서버와 클라이언트가 공유한다. */
export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'MODEL_TIMEOUT'
  | 'MODEL_UNAVAILABLE'
  | 'MODEL_SCHEMA_INVALID'
  | 'MODEL_REFUSED'
  | 'INTERNAL';

interface ErrorSpec {
  status: number;
  retryable: boolean;
  /** 사용자에게 보여줄 한국어 문구 */
  message: string;
  /** 오류 화면의 보조 설명 */
  detail: string;
}

export const ERROR_SPECS: Record<ApiErrorCode, ErrorSpec> = {
  VALIDATION_FAILED: {
    status: 422,
    retryable: false,
    message: '입력한 조건을 다시 확인해 주세요.',
    detail: '일부 항목이 형식에 맞지 않습니다. 표시된 항목을 수정한 뒤 다시 시도해 주세요.',
  },
  PAYLOAD_TOO_LARGE: {
    status: 413,
    retryable: false,
    message: '입력 내용이 너무 깁니다.',
    detail: '추가 요청 내용을 줄인 뒤 다시 시도해 주세요.',
  },
  RATE_LIMITED: {
    status: 429,
    retryable: true,
    message: '요청이 너무 잦습니다.',
    detail: '잠시 후 다시 시도해 주세요. 짧은 시간에 여러 번 생성하면 일시적으로 제한됩니다.',
  },
  MODEL_TIMEOUT: {
    status: 504,
    retryable: true,
    message: '일정 생성이 지연되고 있습니다.',
    detail: '잠시 후 다시 시도해 주세요. 여행 기간을 줄이면 더 빨리 생성됩니다.',
  },
  MODEL_UNAVAILABLE: {
    status: 503,
    retryable: true,
    message: '일정 생성 서비스에 일시적으로 연결할 수 없습니다.',
    detail: '잠시 후 다시 시도해 주세요.',
  },
  MODEL_SCHEMA_INVALID: {
    status: 502,
    retryable: true,
    message: '일정을 만들지 못했습니다.',
    detail: '생성 결과가 올바른 형태로 오지 않았습니다. 다시 시도하면 대부분 해결됩니다.',
  },
  MODEL_REFUSED: {
    status: 422,
    retryable: false,
    message: '이 조건으로는 일정을 만들 수 없습니다.',
    detail: '여행지나 요청 내용을 바꿔서 다시 시도해 주세요.',
  },
  INTERNAL: {
    status: 500,
    retryable: true,
    message: '예기치 못한 문제가 발생했습니다.',
    detail: '잠시 후 다시 시도해 주세요.',
  },
};

export class PlanError extends Error {
  readonly code: ApiErrorCode;
  readonly fields: Record<string, string> | null;

  constructor(code: ApiErrorCode, fields: Record<string, string> | null = null) {
    super(ERROR_SPECS[code].message);
    this.name = 'PlanError';
    this.code = code;
    this.fields = fields;
  }
}
