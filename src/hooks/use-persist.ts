import { useCallback, useEffect, useRef, useState } from 'react';

import { debounce } from '../lib/utils/async';

/**
 * 값의 직렬화/역직렬화를 담당하는 인터페이스
 * @template T 직렬화할 값의 타입
 */
export interface Serializer<T> {
  /** 문자열을 T 타입으로 파싱하는 함수 */
  parse: (value: string) => T;
  /** T 타입 값을 문자열로 직렬화하는 함수 */
  stringify: (value: T) => string;
}

/**
 * usePersist 훅의 옵션 인터페이스
 * @template T 저장할 값의 타입
 */
export interface PersistOptions<T> {
  /** 커스텀 직렬화/역직렬화 함수 (기본값: JSON.parse/stringify) */
  serializer?: Serializer<T>;
  /** 디바운스 지연 시간(ms) (기본값: 300) */
  debounceMs?: number;
  /** 탭 간 동기화 여부 (기본값: true) */
  syncAcrossTabs?: boolean;
}

/**
 * localStorage에 값을 지속적으로 저장하고 동기화하는 커스텀 훅
 *
 * @template T 저장할 값의 타입
 * @param key localStorage 키
 * @param initialValue 초기값
 * @param options 추가 옵션
 * @returns [현재값, 값 설정 함수, 값 삭제 함수, 즉시 저장 함수]
 *
 * @example
 * ```typescript
 * // 기본 사용법
 * const [count, setCount, removeCount] = usePersist('count', 0);
 *
 * // 커스텀 직렬화와 함께
 * const [user, setUser] = usePersist('user', null, {
 *   serializer: {
 *     parse: JSON.parse,
 *     stringify: JSON.stringify
 *   },
 *   debounceMs: 500
 * });
 *
 * // 즉시 저장
 * const [, , , setCountImmediate] = usePersist('count', 0);
 * setCountImmediate(42); // 디바운스 없이 즉시 저장
 * ```
 */
export default function usePersist<T>(key: string, initialValue: T, options: PersistOptions<T> = {}) {
  const {
    serializer = {
      parse: JSON.parse,
      stringify: JSON.stringify,
    },
    debounceMs = 300,
    syncAcrossTabs = true,
  } = options;

  const isClient = typeof window !== 'undefined' && !!window.localStorage;

  const isInternalUpdate = useRef(false);

  const [value, setValue] = useState<T>(() => {
    if (!isClient) return initialValue;
    try {
      const savedValue = localStorage.getItem(key);
      return savedValue != null ? serializer.parse(savedValue) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  type DebouncedFunction = ((...args: unknown[]) => void) & { cancel: () => void };

  const debouncedWrite = useRef<DebouncedFunction>(
    debounce((...args: unknown[]) => {
      const [k, v] = args as [string, T];
      if (!isClient) return;
      try {
        localStorage.setItem(k, serializer.stringify(v));
      } catch (error) {
        console.warn(`Error setting localStorage key "${k}":`, error);
      }
    }, debounceMs) as DebouncedFunction
  );

  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    debouncedWrite.current(key, value);
  }, [key, value]);

  useEffect(() => {
    if (!isClient || !syncAcrossTabs) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== key) return;
      try {
        isInternalUpdate.current = true;
        if (e.newValue === null) {
          setValue(initialValue);
        } else {
          setValue(serializer.parse(e.newValue));
        }
      } catch (error) {
        console.warn(`Error parsing storage event for key "${key}":`, error);
        isInternalUpdate.current = false;
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue, serializer, syncAcrossTabs, isClient]);

  const removeValue = useCallback(() => {
    if (!isClient) return;
    try {
      localStorage.removeItem(key);
      setValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue, isClient]);

  const setValueImmediate = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      if (debouncedWrite.current && typeof debouncedWrite.current.cancel === 'function') {
        debouncedWrite.current.cancel();
      }
      setValue(prev => {
        const resolvedValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(prev) : newValue;

        if (isClient) {
          try {
            localStorage.setItem(key, serializer.stringify(resolvedValue));
          } catch (error) {
            console.warn(`Error setting localStorage key "${key}" immediately:`, error);
          }
        }
        return resolvedValue;
      });
    },
    [key, serializer, isClient]
  );

  return [value, setValue, removeValue, setValueImmediate] as const;
}
