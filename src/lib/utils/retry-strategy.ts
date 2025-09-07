/**
 * @fileoverview
 * 재시도( retry ) 전략을 정의하는 인터페이스와 그 구현체를 제공합니다.
 * 네트워크 오류, 임시 장애 등 일시적 실패 상황에서 반복적으로 작업을 시도할 수 있도록 전략을 캡슐화합니다.
 * 기본적으로 지수 백오프(Exponential Backoff) 재시도 전략 구현을 포함합니다.
 *
 * @module RetryStrategy
 */

/**
 * 비동기 작업의 재시도 전략을 정의하는 인터페이스입니다.
 *
 * @remarks
 * - 이 인터페이스를 구현하여 다양한 재시도 정책(고정 지연, 지수 백오프, 커스텀 조건 등)을 만들 수 있습니다.
 * - 각 시도마다 재시도 여부와 대기 시간을 동적으로 결정할 수 있습니다.
 *
 * @example
 * ```typescript
 * // 5번까지 시도하고, 매번 1초씩 대기하는 단순 전략 예시
 * class SimpleRetry implements RetryStrategy {
 *   shouldRetry(attempt: number, error: unknown): boolean {
 *     console.warn(`Attempt ${attempt} failed:`, error);
 *     return attempt <= 5;
 *   }
 *   getDelay(attempt: number): number {
 *     return 1000; // 1초 고정 지연
 *   }
 * }
 * ```
 */
export interface RetryStrategy {
  /**
   * 재시도를 계속할지 결정합니다.
   *
   * @param attempt 현재까지 시도한 횟수 (1부터 시작)
   * @param error   직전 시도에서 발생한 오류 객체
   * @returns 재시도할 경우 true, 중단할 경우 false
   */
  shouldRetry(attempt: number, error: unknown): boolean;

  /**
   * 지정된 시도(attempt)에 대해 대기할 시간(밀리초)을 반환합니다.
   *
   * @param attempt 현재까지 시도한 횟수 (1부터 시작)
   * @returns 대기 시간(밀리초)
   */
  getDelay(attempt: number): number;
}

/**
 * 기본 지수 백오프(Exponential Backoff) 재시도 전략 구현입니다.
 *
 * 네트워크 오류 등 일시적인 실패가 있을 때, 재시도 간의 대기 시간을 기하급수적으로 증가시켜 서버 과부하를 방지합니다.
 * 약간의 지터(jitter)를 추가하여 동시 재시도 폭주를 완화합니다.
 *
 * @example
 * ```ts
 * const retryStrategy = new ExponentialBackoffRetryStrategy(5, 100, 2, 0.3);
 * for (let attempt = 1; attempt <= 5; attempt++) {
 *   if (!retryStrategy.shouldRetry(attempt, error)) break;
 *   const delay = retryStrategy.getDelay(attempt);
 *   await sleep(delay);
 * }
 * ```
 */
export class ExponentialBackoffRetryStrategy implements RetryStrategy {
  /**
   * 최대 재시도 횟수
   */
  private readonly maxRetries: number;
  /**
   * 최초 지연(밀리초)
   */
  private readonly baseDelay: number;
  /**
   * 백오프 계수(지연 배수)
   */
  private readonly backoffFactor: number;
  /**
   * 지터 비율(0~1, 랜덤 오차 범위)
   */
  private readonly jitter: number;

  /**
   * 새로운 지수 백오프 재시도 전략을 생성합니다.
   * @param maxRetries 최대 재시도 횟수 (기본값: 3)
   * @param baseDelay 최초 지연(밀리초, 기본값: 200)
   * @param backoffFactor 지연 배수 (기본값: 2)
   * @param jitter 지터 비율 (0~1, 기본값: 0.2)
   */
  constructor(maxRetries: number = 3, baseDelay: number = 200, backoffFactor: number = 2, jitter: number = 0.2) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.backoffFactor = backoffFactor;
    this.jitter = jitter;
  }

  /**
   * 재시도해야 할지 여부를 반환합니다.
   * @param attempt 현재 시도 횟수(1부터 시작)
   * @param _error 직전 오류 객체(사용 안 함)
   * @returns true면 재시도, false면 중단
   */
  shouldRetry(attempt: number): boolean {
    return attempt <= this.maxRetries;
  }

  /**
   * 지정된 시도(attempt)에 대한 대기 시간을 계산합니다.
   * @param attempt 현재 시도 횟수(1부터 시작)
   * @returns 밀리초 단위 지연 시간
   */
  getDelay(attempt: number): number {
    const baseDelay = this.baseDelay * Math.pow(this.backoffFactor, attempt - 1);
    const jitterAmount = baseDelay * this.jitter;
    const jitter = Math.random() * jitterAmount * 2 - jitterAmount;
    return Math.max(0, baseDelay + jitter);
  }
}

/**
 * 인증 관련 재시도 전략 - 네트워크 에러만 재시도하고 인증 에러는 즉시 실패
 */
export class AuthRetryStrategy extends ExponentialBackoffRetryStrategy {
  /**
   * 네트워크 에러인지 확인하는 함수
   */
  private isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('Failed to fetch')
      );
    }
    return false;
  }

  /**
   * 인증 에러인지 확인하는 함수
   */
  private isAuthError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'code' in error) {
      const authError = error as { code: string };
      return ['INVALID_CREDENTIALS', 'USER_NOT_FOUND', 'EMAIL_NOT_CONFIRMED', 'INVALID_PASSWORD'].includes(
        authError.code
      );
    }
    return false;
  }

  /**
   * 재시도 여부를 결정합니다. 인증 에러는 재시도하지 않습니다.
   * @param attempt 현재 시도 횟수
   * @param error 발생한 에러
   * @returns 재시도 가능하면 true
   */
  override shouldRetry(attempt: number, error?: unknown): boolean {
    // 인증 에러는 재시도하지 않음
    if (error && this.isAuthError(error)) {
      return false;
    }

    // 네트워크 에러가 아닌 경우도 재시도하지 않음
    if (error && !this.isNetworkError(error)) {
      return false;
    }

    return super.shouldRetry(attempt);
  }
}
