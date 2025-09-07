import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Timeout } from '@/@types/global';

/**
 * 입력값 상태 관리를 위한 커스텀 훅
 *
 * - 문자열, 숫자, JSON 등 다양한 타입의 입력값을 다룰 수 있습니다.
 * - parser를 지정하면 입력값을 원하는 타입으로 변환할 수 있습니다.
 * - onChange 콜백을 통해 값 변경 시 추가 동작을 수행할 수 있습니다.
 * - debounceTime을 지정하면 입력 이벤트를 디바운스하여 처리할 수 있습니다.
 *
 * @template T 입력값 타입
 * @param initialValue - 입력의 초기값
 * @param options - 입력 동작 옵션
 * @param options.parser - 입력값(string)을 원하는 타입 T으로 파싱하는 함수 (기본값: identity)
 * @param options.onChange - 값이 변경될 때 호출되는 콜백 (debounceTime이 있을 때는 디바운스 후 호출)
 * @param options.debounceTime - 디바운스 대기 시간(ms), 0 이하면 즉시 반영 (기본값: 0)
 * @returns
 *   - value: 디바운스 미사용 시 현재 입력값
 *   - defaultValue: 디바운스 사용 시 입력값 (input에 defaultValue로 연결)
 *   - onChange: input의 onChange에 연결할 핸들러
 *
 * @example
 * // 기본 문자열 입력 관리
 * const input = useInput('')
 * <input value={input.value} onChange={input.onChange} />
 *
 * @example
 * // 숫자 입력 관리
 * const input = useInput(0, { parser: v => Number(v) })
 * <input value={input.value} onChange={input.onChange} type="number" />
 *
 * @example
 * // JSON 파싱 예시
 * const input = useInput({}, {
 *   parser: v => { try { return JSON.parse(v) } catch { return {} } }
 * })
 * <input value={JSON.stringify(input.value)} onChange={input.onChange} />
 *
 * @example
 * // 값 변경 시 콜백 실행
 * const input = useInput('', {
 *   onChange: (val, e) => console.log('입력값:', val)
 * })
 * <input value={input.value} onChange={input.onChange} />
 *
 * @example
 * // 디바운스 적용 (500ms)
 * const input = useInput('', { debounceTime: 500 })
 * <input defaultValue={input.defaultValue} onChange={input.onChange} />
 */
export default function useInput<T>(
  initialValue: T,
  options?: {
    parser?: (value: string) => T;
    onChange?: (value: T, e: ChangeEvent<HTMLInputElement>) => void;
    debounceTime?: number;
  }
): {
  value?: T;
  defaultValue?: T;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
} {
  /**
   * 입력값을 파싱하는 함수 (기본값: identity)
   */
  const parser = useMemo(() => options?.parser ?? ((v: string) => v as unknown as T), [options?.parser]);

  /**
   * 값 변경 시 호출되는 콜백
   */
  const changedCallback = options?.onChange;

  /**
   * 입력값 상태
   */
  const [value, setValue] = useState<T>(initialValue);

  /**
   * 디바운스 대기 시간(ms)
   */
  const debounceTime = options?.debounceTime ?? 0;

  /**
   * 디바운스 타이머 ref
   */
  const timerRef = useRef<Timeout | null>(null);

  /**
   * input의 onChange 핸들러
   */
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const parsed = parser(e.target.value);

      if (debounceTime > 0) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setValue(parsed as T);
          changedCallback?.(parsed as T, e);
        }, debounceTime);
      } else {
        setValue(parsed as T);
        changedCallback?.(parsed as T, e);
      }
    },
    [parser, debounceTime, changedCallback]
  );

  /**
   * initialValue가 변경되면 value도 초기화
   */
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  /**
   * 컴포넌트 언마운트 시 타이머 정리
   */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    [debounceTime > 0 ? 'defaultValue' : 'value']: value,
    onChange: handleChange,
  };
}
