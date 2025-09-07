import { useCallback, useEffect, useState } from 'react';

/**
 * useToggleState - 불린 상태 토글을 간편하게 관리할 수 있는 React 커스텀 훅
 *
 * 이 훅은 on/off/toggle/직접설정(set) 등 불린 상태에 특화된 유틸리티 함수와 함께
 * 현재 상태값을 반환합니다. 초기값 변경에도 상태가 동기화됩니다.
 *
 * @param {boolean} [initialValue=true]
 *   - 토글의 초기 상태값 (기본값: true)
 *
 * @returns {[boolean, { on: () => void, off: () => void, toggle: () => void, set: React.Dispatch<React.SetStateAction<boolean>> }]}
 *   - isToggle: 현재 불린 상태값
 *   - controls: 상태 제어 함수 객체
 *     - on(): true로 설정
 *     - off(): false로 설정
 *     - toggle(): 현재값을 반전
 *     - set(value: boolean | (prev: boolean) => boolean): 직접 값 설정
 *
 * @example
 * // 기본 사용법
 * const [isToggle, { on, off, toggle, set }] = useToggleState();
 *
 * // 상태를 true로 전환
 * on();
 * // 상태를 false로 전환
 * off();
 * // 상태를 반전
 * toggle();
 * // 직접 값 할당
 * set(false);
 *
 * @example
 * // 초기값을 false로 설정
 * const [isToggle, controls] = useToggleState(false);
 *
 * // 상태 확인
 * console.log(isToggle); // false
 *
 * @example
 * // 외부 prop 등으로 초기값을 동적으로 전달
 * const [opened, controls] = useToggleState(props.defaultOpen);
 *
 * // props.defaultOpen이 바뀌면 상태도 동기화됨
 */
export default function useToggleState(initialValue: boolean = true) {
  const [isToggle, setIsToggle] = useState<boolean>(initialValue);

  const on = useCallback(() => setIsToggle(true), []);
  const off = useCallback(() => setIsToggle(false), []);
  const toggle = useCallback(() => setIsToggle(t => !t), []);

  useEffect(() => {
    // 초기값 변경 시 상태 동기화
    setIsToggle(initialValue);
  }, [initialValue]);

  return [isToggle, { on, off, toggle, set: setIsToggle }] as const;
}
