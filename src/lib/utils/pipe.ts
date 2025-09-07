/**
 * 함수 파이프라인 유틸리티 - 완전한 타입 안전성
 *
 * 여러 함수를 순차적으로 합성하여 데이터를 변환하는 기능을 제공합니다.
 * 타입 안전성과 성능 최적화를 고려하여 설계되었습니다.
 */

/**
 * 기본 함수 타입 정의
 *
 * @template T 입력값 타입
 * @template U 반환값 타입
 */
type Fn<T = unknown, U = unknown> = (value: T) => U;

/**
 * 비동기 함수 타입 정의
 *
 * @template T 입력값 타입
 * @template U 반환값 타입 (Promise 가능)
 */
type AsyncFn<T = unknown, U = unknown> = (value: T) => U | Promise<U>;

/**
 * 튜플의 마지막 요소 추출 유틸리티 타입
 *
 * @template T 튜플 타입
 */
type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer R] ? R : never;

/**
 * 파이프라인의 최종 출력 타입 추론
 *
 * @template T 함수 배열 타입
 */
type PipeOutput<T extends readonly Fn[]> = Last<T> extends Fn<any, infer R> ? R : unknown;

/**
 * 파이프 실행 중 발생한 오류를 나타내는 에러 클래스
 */
class PipeExecutionError extends Error {
  /**
   * @param message 에러 메시지
   * @param step 오류가 발생한 단계 (0-based index)
   * @param originalError 원본 에러 객체 (선택)
   */
  constructor(
    message: string,
    public readonly step: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'PipeExecutionError';
  }
}

/**
 * 파이프라인 함수 유효성 검사 실패 시 발생하는 에러 클래스
 */
class PipeValidationError extends Error {
  /**
   * @param message 에러 메시지
   * @param index 잘못된 인자의 인덱스
   */
  constructor(
    message: string,
    public readonly index: number
  ) {
    super(message);
    this.name = 'PipeValidationError';
  }
}

/**
 * 파이프 단계에서 타임아웃이 발생했을 때 던져지는 에러 클래스
 */
class PipeTimeoutError extends Error {
  /**
   * @param message 에러 메시지
   * @param timeoutMs 타임아웃 시간(ms)
   * @param step 타임아웃이 발생한 단계 (0-based index)
   */
  constructor(
    message: string,
    public readonly timeoutMs: number,
    public readonly step: number
  ) {
    super(message);
    this.name = 'PipeTimeoutError';
  }
}

/**
 * 파이프 단계 재시도 실패 시 발생하는 에러 클래스
 */
class PipeRetryError extends Error {
  /**
   * @param message 에러 메시지
   * @param attempts 수행한 재시도 횟수
   * @param lastError 마지막으로 발생한 에러 객체
   */
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'PipeRetryError';
  }
}

/**
 * 파이프 실행이 중단(abort)되었을 때 발생하는 에러 클래스
 */
class PipeAbortError extends Error {
  /**
   * @param message 에러 메시지
   * @param step 취소가 발생한 단계 (0-based index)
   */
  constructor(message: string, public readonly step: number) {
    super(message);
    this.name = 'PipeAbortError';
  }
}

/**
 * 타입 가드 유틸리티 - 값이 함수인지 확인합니다.
 *
 * @param fn - 검사할 값
 * @returns 함수인 경우 true, 아닌 경우 false
 *
 * @example
 * ```typescript
 * if (isFunction(someValue)) {
 *   // someValue는 이제 Function 타입으로 추론됩니다
 *   someValue();
 * }
 * ```
 */
export const isFunction = <T = unknown, U = unknown>(fn: unknown): fn is (...args: T[]) => U =>
  typeof fn === 'function';

/**
 * 입력값이 Promise 타입인지 확인하는 타입 가드입니다.
 *
 * @template T - Promise의 리턴 타입
 * @param value - 검사할 값
 * @returns 값이 Promise<T> 타입이면 true, 아니면 false
 *
 * @example
 * ```typescript
 * const maybePromise: unknown = Promise.resolve(1);
 * if (isPromise(maybePromise)) {
 *   maybePromise.then(console.log);
 * }
 * ```
 */
export const isPromise = <T = unknown>(value: unknown): value is Promise<T> =>
  value != null &&
  typeof value === 'object' &&
  'then' in value &&
  typeof (value as any).then === 'function';

/**
 * 함수가 비동기(async) 함수인지 확인하는 타입 가드입니다.
 *
 * @param fn - 검사할 함수
 * @returns 비동기 함수이면 true, 아니면 false
 *
 * @example
 * ```typescript
 * const asyncFn = async () => {};
 * if (isAsyncFunction(asyncFn)) { // asyncFn은 이제 (...args: any[]) => Promise<any> 타입으로 추론됩니다 }
 * ```
 */
export const isAsyncFunction = (fn: unknown): fn is (...args: any[]) => Promise<any> => {
  if (!isFunction(fn)) return false;
  return fn.constructor.name === 'AsyncFunction' || fn.toString().includes('async ');
};

/**
 * 값이 null이 아니고 객체(배열 제외)인지 확인하는 타입 가드입니다.
 *
 * @param value - 검사할 값
 * @returns 객체이면 true, 아니면 false
 *
 * @example
 * ```typescript
 * if (isObject({ a: 1 })) { // ... }
 * ```
 */
export const isObject = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

/**
 * 값이 배열인지 확인하는 타입 가드입니다.
 *
 * @template T - 배열 요소 타입
 * @param value - 검사할 값
 * @returns 배열이면 true, 아니면 false
 *
 * @example
 * ```typescript
 * if (isArray([1, 2, 3])) { // ... }
 * ```
 */
export const isArray = <T = unknown>(value: unknown): value is T[] => Array.isArray(value);

/**
 * 값이 문자열(string)인지 확인하는 타입 가드입니다.
 *
 * @param value - 검사할 값
 * @returns 문자열이면 true, 아니면 false
 *
 * @example
 * ```typescript
 * if (isString("hello")) { // ... }
 * ```
 */
export const isString = (value: unknown): value is string => typeof value === 'string';

/**
 * 값이 유효한 숫자(number)인지 확인하는 타입 가드입니다.
 *
 * @param value - 검사할 값
 * @returns 유한한 숫자이면 true, 아니면 false
 *
 * @example
 * ```typescript
 * if (isNumber(123.45)) { // ... }
 * ```
 */
export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value);

/**
 * 값이 boolean 타입인지 확인하는 타입 가드입니다.
 *
 * @param value - 검사할 값
 * @returns 불린값이면 true, 아니면 false
 *
 * @example
 * ```typescript
 * if (isBoolean(true)) { // ... }
 * ```
 */
export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

/**
 * 값이 null 또는 undefined인지 확인하는 타입 가드입니다.
 *
 * @param value - 검사할 값
 * @returns null 또는 undefined이면 true, 아니면 false
 *
 * @example
 * ```typescript
 * if (isNullish(undefined)) { // ... }
 * ```
 */
export const isNullish = (value: unknown): value is null | undefined => value == null;

/**
 * 함수의 인자 개수(arity)가 기대값과 일치하는지 검증합니다.
 *
 * @param fn - 검사할 함수
 * @param expectedArity - 기대하는 인자 개수
 * @returns 인자 개수가 일치하면 true, 아니면 false
 *
 * @example
 * ```typescript
 * function foo(a: number, b: number) {}
 * validateFunctionArity(foo, 2); // true
 * ```
 */
export const validateFunctionArity = (fn: Function, expectedArity: number): boolean =>
  fn.length === expectedArity;

/**
 * 런타임 타입 검증기 인터페이스입니다.
 *
 * @template T - 검증 대상 타입
 */
export interface TypeValidator<T> {
  /**
   * 값이 T 타입인지 검증합니다.
   * @param value - 검사할 값
   * @returns T 타입이면 true, 아니면 false
   */
  validate: (value: unknown) => value is T;
  /**
   * 검증 실패 시 사용할 에러 메시지입니다.
   */
  errorMessage: string;
}

/**
 * 타입 검증기를 생성합니다.
 *
 * @template T - 검증 대상 타입
 * @param validator - 타입 가드 함수
 * @param errorMessage - 검증 실패 시 사용할 메시지
 * @returns TypeValidator<T> 객체
 *
 * @example
 * ```typescript
 * const stringValidator = createTypeValidator(isString, "문자열이어야 합니다");
 * ```
 */
export const createTypeValidator = <T>(
  validator: (value: unknown) => value is T,
  errorMessage: string
): TypeValidator<T> => ({
  validate: validator,
  errorMessage,
});

/**
 * 여러 타입 검증기를 AND(모두 만족)로 결합합니다.
 *
 * @template T - 검증 대상 타입
 * @param validators - 결합할 TypeValidator 배열
 * @returns 모든 조건을 만족하는 TypeValidator
 *
 * @example
 * ```typescript
 * const numberString = combineValidators(
 *   createTypeValidator(isString, "문자열"),
 *   createTypeValidator(v => v.length > 0, "빈 문자열 불가")
 * );
 * ```
 */
export const combineValidators = <T>(...validators: TypeValidator<T>[]): TypeValidator<T> => ({
  validate: (value: unknown): value is T => validators.every(v => v.validate(value)),
  errorMessage: validators.map(v => v.errorMessage).join(' AND '),
});

/**
 * 여러 타입 검증기를 OR(하나라도 만족)로 결합합니다.
 *
 * @template T - 검증 대상 타입
 * @param validators - 결합할 TypeValidator 배열
 * @returns 하나라도 만족하면 통과하는 TypeValidator
 *
 * @example
 * ```typescript
 * const stringOrNumber = anyValidator(
 *   createTypeValidator(isString, "문자열"),
 *   createTypeValidator(isNumber, "숫자")
 * );
 * ```
 */
export const anyValidator = <T>(...validators: TypeValidator<T>[]): TypeValidator<T> => ({
  validate: (value: unknown): value is T => validators.some(v => v.validate(value)),
  errorMessage: validators.map(v => v.errorMessage).join(' OR '),
});

/**
 * 개발 모드에서만 함수 검증을 수행합니다 (성능 최적화)
 *
 * @param fns - 검증할 함수 배열
 * @throws {PipeValidationError} 함수가 아닌 값이 포함된 경우
 */
const validateFunctions = (fns: readonly Fn[]) => {
  const isDevelopment = (() => {
    // Vite 환경을 먼저 확인
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.MODE !== 'production';
    }
    // Node.js 환경으로 폴백
    if (typeof process !== 'undefined' && process.env) {
      return process.env.NODE_ENV === 'development';
    }
    // 알 수 없는 환경에서는 기본값 false
    return false;
  })();
  if (isDevelopment) {
    fns.forEach((fn, i) => {
      if (!isFunction(fn)) {
        throw new PipeValidationError(`${i}번째 인자가 함수가 아닙니다`, i);
      }
    });
  }
};

/**
 * 여러 함수를 순차적으로 실행하며 에러 핸들링 및 트레이싱을 지원하는 파이프 실행 로직입니다.
 *
 * @template T - 입력값 타입
 * @param fns - 실행할 함수 배열
 * @param value - 파이프라인에 전달할 초기 입력값
 * @param options - 실행 옵션
 *   @property enableTrace - true인 경우 각 단계별 결과 및 에러를 콘솔에 출력합니다
 *   @property operationName - 트레이스 메시지에 표시할 연산 이름(기본값: 'Pipe')
 * @returns 모든 함수가 성공적으로 실행된 경우 최종 결과를 반환합니다
 * @throws {PipeExecutionError} 실행 중 에러 발생 시 오류 위치 정보와 함께 래핑하여 던집니다
 *
 * @example
 * ```typescript
 * const add = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 * const result = executeWithErrorHandling([add, double], 3);
 * // result === 8
 *
 * // 트레이스 활성화
 * executeWithErrorHandling([add, double], 3, { enableTrace: true });
 * ```
 */
const executeWithErrorHandling = <T>(
  fns: readonly Fn[],
  value: T,
  options: {
    enableTrace?: boolean;
    operationName?: string;
  } = {}
): unknown => {
  const { enableTrace = false, operationName = 'Pipe' } = options;

  if (enableTrace) {
    console.log(`${operationName} trace - 입력값:`, value);
  }

  let result: unknown = value;
  let currentStep = 0;

  try {
    for (let i = 0; i < fns.length; i++) {
      currentStep = i;
      const fn = fns[i];

      if (!fn) {
        throw new Error(`${i}번째 함수가 정의되지 않았습니다.`);
      }

      result = fn(result);

      if (enableTrace) {
        console.log(`${operationName} - ${i + 1}단계 결과:`, result);
      }
    }

    if (enableTrace) {
      console.log(`${operationName} trace - 최종 결과:`, result);
    }

    return result;
  } catch (error) {
    const errorMessage = `${operationName} 실행 중 ${currentStep + 1}번째 단계에서 오류 발생: ${
      error instanceof Error ? error.message : String(error)
    }`;

    if (enableTrace) {
      console.error(`${operationName} trace - ${currentStep + 1}단계에서 오류:`, error);
    }

    throw new PipeExecutionError(errorMessage, currentStep + 1, error instanceof Error ? error : undefined);
  }
};

/**
 * 비동기 실행 옵션 인터페이스
 */
export interface AsyncExecutionOptions {
  enableTrace?: boolean;
  operationName?: string;
  timeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  abortSignal?: AbortSignal;
}

/**
 * Promise에 타임아웃을 적용하는 유틸리티 함수
 */
const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  step: number
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new PipeTimeoutError(
        `${step + 1}번째 단계에서 ${timeoutMs}ms 타임아웃 발생`,
        timeoutMs,
        step + 1
      ));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
};

/**
 * 지수 백오프를 사용한 재시도 로직
 */
const withRetry = async <T>(
  fn: () => Promise<T>,
  attempts: number,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (i === attempts - 1) {
        throw new PipeRetryError(
          `${attempts}번의 재시도 후에도 실패했습니다`,
          attempts,
          lastError
        );
      }
      
      // 지수 백오프: 2^i * delayMs
      const backoffDelay = delayMs * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  throw lastError!;
};

/**
 * 비동기 함수 파이프라인 실행을 위한 고급 로직입니다.
 * timeout, retry, cancellation을 지원하며 각 비동기(또는 동기) 함수를 순차적으로 실행합니다.
 *
 * @template T 입력값 타입
 * @param fns - 실행할 비동기/동기 함수 배열
 * @param value - 파이프라인에 전달할 초기 입력값
 * @param options - 실행 옵션
 * @returns 모든 함수를 순차적으로 적용한 최종 결과 Promise
 * @throws {PipeExecutionError} 실행 중 에러가 발생한 경우
 * @throws {PipeTimeoutError} 타임아웃이 발생한 경우
 * @throws {PipeRetryError} 재시도 후에도 실패한 경우
 * @throws {PipeAbortError} 작업이 취소된 경우
 */
const executeAsyncWithErrorHandling = async <T>(
  fns: readonly AsyncFn[],
  value: T,
  options: AsyncExecutionOptions = {}
): Promise<unknown> => {
  const {
    enableTrace = false,
    operationName = 'PipeAsync',
    timeoutMs,
    retryAttempts = 1,
    retryDelayMs = 1000,
    abortSignal
  } = options;

  if (enableTrace) {
    console.log(`${operationName} trace - 입력값:`, value);
  }

  let result: unknown = value;
  let currentStep = 0;

  try {
    for (let i = 0; i < fns.length; i++) {
      // 취소 신호 확인
      if (abortSignal?.aborted) {
        throw new PipeAbortError(`${i + 1}번째 단계에서 작업이 취소되었습니다`, i + 1);
      }

      currentStep = i;
      const fn = fns[i];

      if (!fn) {
        throw new Error(`${i}번째 함수가 정의되지 않았습니다`);
      }

      // 재시도 로직이 있는 경우
      const executeStep = async () => {
        const fnResult = fn(result);
        return isPromise(fnResult) ? await fnResult : fnResult;
      };

      let stepResult: unknown;
      
      if (retryAttempts > 1) {
        stepResult = await withRetry(executeStep, retryAttempts, retryDelayMs);
      } else {
        stepResult = await executeStep();
      }

      // 타임아웃 적용
      if (timeoutMs && isPromise(stepResult)) {
        result = await withTimeout(stepResult as Promise<unknown>, timeoutMs, i);
      } else {
        result = stepResult;
      }

      if (enableTrace) {
        console.log(`${operationName} - ${i + 1}단계 결과:`, result);
      }
    }

    if (enableTrace) {
      console.log(`${operationName} trace - 최종 결과:`, result);
    }

    return result;
  } catch (error) {
    if (error instanceof PipeTimeoutError || 
        error instanceof PipeRetryError || 
        error instanceof PipeAbortError) {
      throw error;
    }

    const errorMessage = `${operationName} 실행 중 ${currentStep + 1}번째 단계에서 오류 발생: ${
      error instanceof Error ? error.message : String(error)
    }`;

    if (enableTrace) {
      console.error(`${operationName} trace - ${currentStep + 1}단계에서 오류:`, error);
    }

    throw new PipeExecutionError(errorMessage, currentStep + 1, error instanceof Error ? error : undefined);
  }
};

/**
 * 여러 함수를 좌측에서 우측으로 순차적으로 적용하는 파이프 유틸리티의 타입 인터페이스입니다.
 * 각 함수의 출력이 다음 함수의 입력으로 전달되며, 타입이 안전하게 추론됩니다.
 *
 * @example
 * ```typescript
 * const add = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 * const toString = (x: number) => x.toString();
 *
 * const pipeline: Pipe = pipe(add, double, toString);
 * const result = pipeline(3); // "8"
 * ```
 */
interface Pipe {
  <A, B>(f1: Fn<A, B>): Fn<A, B>;
  <A, B, C>(f1: Fn<A, B>, f2: Fn<B, C>): Fn<A, C>;
  <A, B, C, D>(f1: Fn<A, B>, f2: Fn<B, C>, f3: Fn<C, D>): Fn<A, D>;
  <A, B, C, D, E>(f1: Fn<A, B>, f2: Fn<B, C>, f3: Fn<C, D>, f4: Fn<D, E>): Fn<A, E>;
  <A, B, C, D, E, F>(f1: Fn<A, B>, f2: Fn<B, C>, f3: Fn<C, D>, f4: Fn<D, E>, f5: Fn<E, F>): Fn<A, F>;
  <A, B, C, D, E, F, G>(f1: Fn<A, B>, f2: Fn<B, C>, f3: Fn<C, D>, f4: Fn<D, E>, f5: Fn<E, F>, f6: Fn<F, G>): Fn<A, G>;
  <T extends readonly Fn[]>(
    ...fns: T
  ): T extends readonly [Fn<infer A, any>, ...any[]] ? Fn<A, PipeOutput<T>> : Fn<unknown, unknown>;
  // 폴백 케이스
  (...fns: readonly Fn[]): <T>(value: T) => unknown;
}

/**
 * 여러 함수를 좌측에서 우측으로 순차적으로 적용하는 파이프 유틸리티입니다.
 * 각 함수의 출력이 다음 함수의 입력으로 전달되며, 타입이 안전하게 추론됩니다.
 *
 * @param fns - 적용할 함수들의 목록
 * @returns 입력값을 받아 모든 함수를 순차적으로 적용한 결과를 반환하는 함수
 *
 * @example
 * ```typescript
 * // 기본 사용법
 * const add = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 * const pipeline = pipe(add, double);
 * console.log(pipeline(3)); // 8
 *
 * // 타입 변환
 * const toString = (x: number) => x.toString();
 * const addExclamation = (s: string) => s + '!';
 * const pipeline2 = pipe(add, toString, addExclamation);
 * console.log(pipeline2(3)); // "4!"
 *
 * // 빈 파이프 (항등 함수)
 * const identity = pipe();
 * console.log(identity(42)); // 42
 * ```
 *
 * @throws {PipeValidationError} 개발 모드에서 함수가 아닌 인자가 전달된 경우
 * @throws {PipeExecutionError} 파이프 실행 중 에러가 발생한 경우
 */
export const pipe: Pipe = (...fns: readonly Fn[]) => {
  validateFunctions(fns);

  if (fns.length === 0) {
    return <T>(value: T) => value;
  }

  return <T>(value: T) => executeWithErrorHandling(fns, value);
};

/**
 * 비동기 함수 파이프라인 유틸리티의 타입 인터페이스입니다.
 *
 * 여러 비동기(또는 동기) 함수를 순차적으로 실행하여 입력값을 변환하는 파이프라인을 타입 안전하게 정의합니다.
 *
 * @example
 * ```typescript
 * const fetchUser = async (id: number) => ({ id, name: `User${id}` });
 * const getName = (user: { id: number; name: string }) => user.name;
 * const pipeline: PipeAsync = pipeAsync(fetchUser, getName);
 * const name = await pipeline(1); // "User1"
 * ```
 */
interface PipeAsync {
  <A, B>(f1: AsyncFn<A, B>): (value: A) => Promise<B>;
  <A, B, C>(f1: AsyncFn<A, B>, f2: AsyncFn<B, C>): (value: A) => Promise<C>;
  <A, B, C, D>(f1: AsyncFn<A, B>, f2: AsyncFn<B, C>, f3: AsyncFn<C, D>): (value: A) => Promise<D>;
  <A, B, C, D, E>(f1: AsyncFn<A, B>, f2: AsyncFn<B, C>, f3: AsyncFn<C, D>, f4: AsyncFn<D, E>): (value: A) => Promise<E>;
  <A, B, C, D, E, F>(
    f1: AsyncFn<A, B>,
    f2: AsyncFn<B, C>,
    f3: AsyncFn<C, D>,
    f4: AsyncFn<D, E>,
    f5: AsyncFn<E, F>
  ): (value: A) => Promise<F>;
  <A, B, C, D, E, F, G>(
    f1: AsyncFn<A, B>,
    f2: AsyncFn<B, C>,
    f3: AsyncFn<C, D>,
    f4: AsyncFn<D, E>,
    f5: AsyncFn<E, F>,
    f6: AsyncFn<F, G>
  ): (value: A) => Promise<G>;
  // 일반 케이스와 빈 케이스 모두 처리
  (...fns: readonly AsyncFn[]): <T>(value: T) => Promise<unknown>;
}

/**
 * 비동기/동기 함수를 좌측에서 우측으로 순차적으로 적용하는 파이프 유틸리티입니다.
 * timeout, retry, cancellation을 지원하며 각 함수는 Promise를 반환할 수 있습니다.
 *
 * @param fns - 적용할 함수들의 목록 (동기/비동기 혼합 가능)
 * @returns 입력값을 받아 모든 함수를 순차적으로 적용한 결과 Promise를 반환하는 함수
 *
 * @example
 * ```typescript
 * // 기본 사용법
 * const fetchUser = async (id: number) => ({ id, name: `User ${id}` });
 * const formatUser = (user: { id: number, name: string }) => `ID: ${user.id}, Name: ${user.name}`;
 * const pipeline = pipeAsync(fetchUser, formatUser);
 * console.log(await pipeline(1)); // "ID: 1, Name: User 1"
 *
 * // 고급 옵션 사용
 * const pipelineWithOptions = pipeAsyncWithOptions(
 *   { timeoutMs: 5000, retryAttempts: 3, retryDelayMs: 1000 },
 *   fetchUser,
 *   formatUser
 * );
 * ```
 *
 * @throws {PipeValidationError} 개발 모드에서 함수가 아닌 인자가 전달된 경우
 * @throws {PipeExecutionError} 파이프 실행 중 에러가 발생한 경우
 * @throws {PipeTimeoutError} 타임아웃이 발생한 경우
 * @throws {PipeRetryError} 재시도 후에도 실패한 경우
 * @throws {PipeAbortError} 작업이 취소된 경우
 */
export const pipeAsync: PipeAsync = (...fns: readonly AsyncFn[]) => {
  validateFunctions(fns as readonly Fn[]);

  if (fns.length === 0) {
    return async <T>(value: T) => value;
  }

  return async <T>(value: T) => executeAsyncWithErrorHandling(fns, value);
};

/**
 * 고급 옵션을 지원하는 비동기 파이프 유틸리티입니다.
 * timeout, retry, cancellation 등의 기능을 제공합니다.
 *
 * @param options - 실행 옵션
 * @param fns - 적용할 함수들의 목록
 * @returns 옵션이 적용된 비동기 파이프 함수
 *
 * @example
 * ```typescript
 * const controller = new AbortController();
 * const pipeline = pipeAsyncWithOptions(
 *   {
 *     timeoutMs: 5000,
 *     retryAttempts: 3,
 *     retryDelayMs: 1000,
 *     abortSignal: controller.signal,
 *     enableTrace: true
 *   },
 *   fetchData,
 *   processData,
 *   saveData
 * );
 *
 * // 필요시 취소
 * setTimeout(() => controller.abort(), 10000);
 * ```
 */
export const pipeAsyncWithOptions = (
  options: AsyncExecutionOptions,
  ...fns: readonly AsyncFn[]
) => {
  validateFunctions(fns as readonly Fn[]);

  if (fns.length === 0) {
    return async <T>(value: T) => value;
  }

  return async <T>(value: T) => executeAsyncWithErrorHandling(fns, value, options);
};

/**
 * 조건부 파이프 유틸리티입니다.
 * 조건에 따라 다른 함수를 적용할 수 있습니다.
 *
 * @param condition - 조건을 판단하는 함수 또는 boolean 값
 * @param trueFn - 조건이 참일 때 적용할 함수
 * @param falseFn - 조건이 거짓일 때 적용할 함수 (기본값: 항등 함수)
 * @returns 조건부로 함수를 적용하는 함수
 *
 * @example
 * ```typescript
 * const isPositive = (x: number) => x > 0;
 * const double = (x: number) => x * 2;
 * const negate = (x: number) => -x;
 *
 * const conditionalPipe = pipeIf(isPositive, double, negate);
 * console.log(conditionalPipe(5));  // 10
 * console.log(conditionalPipe(-3)); // 3
 *
 * // boolean 조건 사용
 * const alwaysDouble = pipeIf(true, double);
 * console.log(alwaysDouble(4)); // 8
 * ```
 */
export function pipeIf<T, U>(
  condition: ((value: T) => boolean) | boolean,
  trueFn: (value: T) => U,
  falseFn: (value: T) => U = (value: T) => value as unknown as U
): (value: T) => U {
  return (value: T) => {
    const shouldApplyTrue = typeof condition === 'function' ? condition(value) : condition;
    return shouldApplyTrue ? trueFn(value) : falseFn(value);
  };
}

/**
 * Composes functions from right to left (reverse of pipe).
 * This is the mathematical composition: (f ∘ g)(x) = f(g(x))
 * Optimized implementation that avoids array creation for better performance.
 * 극한 최적화된 타입 추론으로 복잡한 조합에서도 정확한 타입 제공
 *
 * @param fns - Functions to compose
 * @returns A new function that applies the functions from right to left
 *
 * @example
 * ```typescript
 * const addOne = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 * const composed = compose(addOne, double); // equivalent to (x) => addOne(double(x))
 * console.log(composed(3)); // 7 (double(3) = 6, then addOne(6) = 7)
 * ```
 */
export const compose: Pipe = (...fns: readonly Fn[]) => {
  validateFunctions(fns);
  if (fns.length === 0) {
    return <T>(value: T) => value;
  }
  return <T>(value: T) => {
    let result: unknown = value;
    let currentStep = 0;
    try {
      for (let i = fns.length - 1; i >= 0; i--) {
        currentStep = fns.length - 1 - i;
        result = fns[i]!(result);
      }
      return result;
    } catch (error) {
      throw new PipeExecutionError(
        `Compose 실행 중 ${currentStep + 1}번째 단계에서 오류 발생`,
        currentStep,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  };
};

/**
 * 입력값을 그대로 반환하는 항등 함수(identity function)입니다.
 *
 * @param value - 반환할 입력값
 * @returns 입력값과 동일한 값
 *
 * @example
 * ```typescript
 * console.log(identity(42));      // 42
 * console.log(identity('hello')); // "hello"
 * [1, 2, 3].map(identity);        // [1, 2, 3]
 * ```
 */
export const identity = <T>(value: T): T => value;

/**
 * 항상 동일한 값을 반환하는 상수 함수를 생성합니다.
 *
 * @param value - 항상 반환할 값
 * @returns 입력값과 관계없이 value를 반환하는 함수
 *
 * @example
 * ```typescript
 * const alwaysFive = constant(5);
 * console.log(alwaysFive()); // 5
 * console.log(alwaysFive(123)); // 5
 *
 * const alwaysHello = constant('hello');
 * ['a', 'b', 'c'].map(alwaysHello); // ['hello', 'hello', 'hello']
 * ```
 */
export const constant =
  <T>(value: T) =>
  (): T =>
    value;

/**
 * 지정한 함수를 입력값에 주어진 횟수만큼 반복 적용하는 유틸리티입니다.
 * 메모리 효율성을 위해 최적화되었습니다.
 *
 * @param fn - 반복 적용할 함수 (인자와 반환값이 동일 타입이어야 함)
 * @param times - 적용할 횟수 (0 이하일 경우 입력값을 그대로 반환)
 * @returns 입력값을 받아 함수를 지정 횟수만큼 연속 적용한 결과를 반환하는 함수
 *
 * @example
 * ```typescript
 * const double = (x: number) => x * 2;
 * const repeatDouble = repeat(double, 3);
 * console.log(repeatDouble(2)); // 16: 2 → 4 → 8 → 16
 *
 * const inc = (x: number) => x + 1;
 * const repeatInc = repeat(inc, 0);
 * console.log(repeatInc(5)); // 5 (times가 0이므로 변화 없음)
 *
 * // 단일 적용 최적화
 * const singleInc = repeat(inc, 1);
 * console.log(singleInc(5)); // 6
 * ```
 */
export function repeat<T>(fn: (value: T) => T, times: number): (value: T) => T {
  if (times < 0) {
    throw new Error('반복 횟수는 0 이상이어야 합니다');
  }
  if (times === 0) {
    return identity;
  }
  if (times === 1) {
    return fn;
  }

  return (value: T) => {
    let result = value;
    for (let i = 0; i < times; i++) {
      result = fn(result);
    }
    return result;
  };
}

/**
 * 디버깅을 위한 파이프 유틸리티입니다.
 * 각 단계별 실행 결과를 콘솔에 출력하여 파이프라인의 동작을 추적할 수 있습니다.
 *
 * @param fns - 적용할 함수들의 목록
 * @returns 각 단계를 추적하며 실행하는 파이프 함수
 *
 * @example
 * ```typescript
 * const add = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 * const tracedPipe = pipeWithTrace(add, double);
 *
 * // 콘솔 출력:
 * // Pipe trace - Input: 3
 * // Step 1 result: 4
 * // Step 2 result: 8
 * // Pipe trace - Final output: 8
 * console.log(tracedPipe(3)); // 8
 * ```
 */
export const pipeWithTrace: Pipe = (...fns: readonly Fn[]) => {
  validateFunctions(fns);

  if (fns.length === 0) {
    return <T>(value: T) => {
      console.log('Pipe trace - 항등 함수, 입력값:', value);
      return value;
    };
  }

  return <T>(value: T) => executeWithErrorHandling(fns, value, { enableTrace: true });
};

/**
 * 값을 변경하지 않고 부수 효과(side effect)를 실행하는 tap 유틸리티입니다.
 * 디버깅이나 로깅에 유용합니다.
 *
 * @param fn - 부수 효과를 실행할 함수
 * @returns 입력값을 그대로 반환하면서 부수 효과를 실행하는 함수
 *
 * @example
 * ```typescript
 * const logAndDouble = pipe(
 *   tap((x: number) => console.log('Input:', x)),
 *   (x: number) => x * 2,
 *   tap((x: number) => console.log('Output:', x))
 * );
 * logAndDouble(5); // 로그: "Input: 5", "Output: 10", 반환값: 10
 * ```
 */
export const tap =
  <T>(fn: (value: T) => void) =>
  (value: T): T => {
    fn(value);
    return value;
  };

/**
 * 배열의 각 요소에 함수를 적용하는 map 유틸리티입니다.
 * 파이프라인에서 배열 변환에 사용됩니다.
 *
 * @param fn - 각 요소에 적용할 변환 함수
 * @returns 배열을 변환하는 함수
 *
 * @example
 * ```typescript
 * const doubleAll = pipeMap((x: number) => x * 2);
 * console.log(doubleAll([1, 2, 3])); // [2, 4, 6]
 *
 * // 파이프라인에서 사용
 * const processNumbers = pipe(
 *   pipeMap((x: number) => x * 2),
 *   pipeFilter((x: number) => x > 5)
 * );
 * console.log(processNumbers([1, 2, 3, 4, 5])); // [6, 8, 10]
 * ```
 */
export const pipeMap =
  <T, U>(fn: (value: T) => U) =>
  (array: T[]): U[] =>
    array.map(fn);

/**
 * 배열의 요소를 조건에 따라 필터링하는 filter 유틸리티입니다.
 * 파이프라인에서 배열 필터링에 사용됩니다.
 *
 * @param predicate - 필터링 조건 함수
 * @returns 배열을 필터링하는 함수
 *
 * @example
 * ```typescript
 * const filterEven = pipeFilter((x: number) => x % 2 === 0);
 * console.log(filterEven([1, 2, 3, 4, 5])); // [2, 4]
 *
 * // 파이프라인에서 사용
 * const processData = pipe(
 *   pipeFilter((x: number) => x > 0),
 *   pipeMap((x: number) => x * x)
 * );
 * console.log(processData([-1, 2, -3, 4])); // [4, 16]
 * ```
 */
export const pipeFilter =
  <T>(predicate: (value: T) => boolean) =>
  (array: T[]): T[] =>
    array.filter(predicate);

/**
 * 함수를 커링(currying)하여 부분 적용이 가능한 함수로 변환합니다.
 *
 * @param fn - 커링할 2개 인자를 받는 함수
 * @returns 첫 번째 인자를 받아 두 번째 인자를 기다리는 함수를 반환하는 함수
 *
 * @example
 * ```typescript
 * const add = (a: number, b: number) => a + b;
 * const curriedAdd = curry(add);
 * const add5 = curriedAdd(5);
 * console.log(add5(3)); // 8
 *
 * // 파이프라인에서 사용
 * const multiply = (a: number, b: number) => a * b;
 * const double = curry(multiply)(2);
 * const pipeline = pipe(double, add5);
 * console.log(pipeline(3)); // 11 (3 * 2 + 5)
 * ```
 */
export const curry =
  <A, B, C>(fn: (a: A, b: B) => C) =>
  (a: A) =>
  (b: B) =>
    fn(a, b);

/**
 * 함수의 일부 인자를 미리 고정하여 새로운 함수를 생성합니다.
 *
 * @param fn - 부분 적용할 함수
 * @param partialArgs - 미리 적용할 인자들
 * @returns 나머지 인자를 받아 원본 함수를 실행하는 함수
 *
 * @example
 * ```typescript
 * const greet = (greeting: string, name: string, punctuation: string) =>
 *   `${greeting} ${name}${punctuation}`;
 *
 * const sayHello = partial(greet, '안녕하세요');
 * console.log(sayHello('김철수', '!')); // "안녕하세요 김철수!"
 *
 * const exclaim = partial(greet, '안녕하세요', '김철수');
 * console.log(exclaim('!')); // "안녕하세요 김철수!"
 * ```
 */
export const partial =
  <T extends unknown[], U>(fn: (...args: T) => U, ...partialArgs: Partial<T>) =>
  (...restArgs: unknown[]) =>
    fn(...(partialArgs.concat(restArgs) as T));

/**
 * 함수의 결과를 메모이제이션하여 동일한 인자에 대해 캐시된 결과를 반환합니다.
 * 성능 최적화가 필요한 순수 함수에 사용하면 효과적입니다.
 *
 * @param fn - 메모이제이션할 함수
 * @returns 캐시 기능이 추가된 함수
 *
 * @example
 * ```typescript
 * const expensiveCalculation = (n: number): number => {
 *   console.log(`계산 중: ${n}`);
 *   return n * n * n;
 * };
 *
 * const memoizedCalc = memoize(expensiveCalculation);
 * console.log(memoizedCalc(5)); // "계산 중: 5", 125
 * console.log(memoizedCalc(5)); // 125 (캐시에서 반환, 로그 없음)
 *
 * // 파이프라인에서 사용
 * const pipeline = pipe(
 *   (x: number) => x + 1,
 *   memoize((x: number) => x * x),
 *   (x: number) => x.toString()
 * );
 * ```
 */
/**
 * 효율적인 키 생성 함수 - JSON.stringify보다 성능 최적화
 * 객체는 JSON.stringify, 원시값은 String() 사용으로 성능 향상
 */
const createMemoKey = <T extends unknown[]>(args: T): string => {
  if (args.length === 0) return 'empty';
  if (args.length === 1) {
    const arg = args[0];
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg !== 'object') return String(arg);
  }

  return args
    .map((arg, index) => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';

      const type = typeof arg;
      if (type !== 'object') return String(arg);

      // 배열 최적화: 길이와 경계 요소만 사용
      if (Array.isArray(arg)) {
        const len = arg.length;
        if (len === 0) return '[]';
        if (len === 1) return `[${String(arg[0])}]`;
        return `[${len}:${String(arg[0])}...${String(arg[len - 1])}]`;
      }

      // 객체: 안전한 JSON 직렬화
      try {
        return JSON.stringify(arg);
      } catch {
        return `[object:${index}]`;
      }
    })
    .join('|');
};

/**
 * 주어진 함수의 결과를 입력 인자에 따라 캐싱(메모이제이션)하는 고성능 유틸리티입니다.
 * 동일한 인자에 대해 재호출시 캐시된 값을 반환하여 연산을 최적화합니다.
 *
 * @template T - 함수 인자 타입 튜플
 * @template U - 반환값 타입
 * @param fn - 메모이제이션할 순수 함수
 * @returns 캐싱 기능이 추가된 함수 (개발 모드에서 getStats, clearCache 메서드 제공)
 *
 * @example
 * ```typescript
 * const slowFn = (n: number) => {
 *   console.log('실행!', n);
 *   return n * n;
 * };
 * const fastFn = memoize(slowFn);
 * fastFn(2); // '실행! 2', 4
 * fastFn(2); // 4 (캐시에서 반환, 로그 없음)
 * ```
 */
export const memoize = <T extends unknown[], U>(fn: (...args: T) => U) => {
  const cache = new Map<string, U>();
  let hitCount = 0;
  let missCount = 0;

  const memoized = (...args: T): U => {
    const key = createMemoKey(args);
    if (cache.has(key)) {
      hitCount++;
      return cache.get(key)!;
    }
    missCount++;
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };

  // 개발 모드에서만 캐시 통계 및 제어 메서드 제공
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    (memoized as any).getStats = () => ({ hitCount, missCount, cacheSize: cache.size });
    (memoized as any).clearCache = () => {
      cache.clear();
      hitCount = 0;
      missCount = 0;
    };
  }

  return memoized;
};

// 에러 타입들을 외부에서 사용할 수 있도록 export
export {
  PipeAbortError, PipeExecutionError, PipeRetryError, PipeTimeoutError, PipeValidationError
};

