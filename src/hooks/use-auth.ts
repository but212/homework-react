import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';

import supabase, { type PartialProfile } from '@/lib/supabase';
import { pipe, pipeIf } from '@/lib/utils/pipe';
import { AuthRetryStrategy } from '@/lib/utils/retry-strategy';

// 에러 타입 정의
export enum AuthErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  PROFILE_ERROR = 'PROFILE_ERROR',
  SESSION_ERROR = 'SESSION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// 로딩 상태 타입 정의
export enum LoadingState {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  SIGNING_IN = 'SIGNING_IN',
  SIGNING_OUT = 'SIGNING_OUT',
  REFRESHING_PROFILE = 'REFRESHING_PROFILE',
  REFRESHING_SESSION = 'REFRESHING_SESSION',
}

// 에러 정보 인터페이스
interface AuthError {
  type: AuthErrorType;
  message: string;
  originalError?: unknown;
  retryable: boolean;
}

// 인증 상태 인터페이스
interface AuthState {
  user: PartialProfile | null;
  loadingState: LoadingState;
  error: AuthError | null;
}

// 에러 생성 헬퍼 함수
const createAuthError = (
  type: AuthErrorType,
  message: string,
  originalError?: unknown,
  retryable: boolean = false
): AuthError => ({
  type,
  message,
  originalError,
  retryable,
});

// 네트워크 에러 감지 함수 (pipe 활용)
const isNetworkError = pipe(
  (error: unknown) => (error instanceof Error ? error.message : ''),
  (message: string) => message.includes('fetch') || message.includes('network') || message.includes('timeout')
);

// 에러 타입별 처리 파이프라인
const processAuthError = pipe(
  (error: unknown) => ({ error, isNetwork: isNetworkError(error) }),
  pipeIf(
    ({ isNetwork }) => isNetwork,
    ({ error }) => createAuthError(AuthErrorType.NETWORK_ERROR, '네트워크 연결을 확인해주세요.', error, true),
    ({ error }) => createAuthError(AuthErrorType.PROFILE_ERROR, '사용자 프로필을 불러올 수 없습니다.', error, false)
  )
);

// 세션 에러 처리 파이프라인
const processSessionError = pipe(
  (error: unknown) => ({ error, isNetwork: isNetworkError(error) }),
  pipeIf(
    ({ isNetwork }) => isNetwork,
    ({ error }) => createAuthError(AuthErrorType.NETWORK_ERROR, '네트워크 연결을 확인해주세요.', error, true),
    ({ error }) => createAuthError(AuthErrorType.SESSION_ERROR, '초기 인증 상태 확인 중 오류가 발생했습니다.', error)
  )
);

/**
 * 개선된 사용자 인증 상태 관리 커스텀 훅
 *
 * 주요 개선사항:
 * - 에러 타입 세분화 (네트워크, 인증, 프로필 등)
 * - 로딩 상태 세분화 (초기화, 로그인, 로그아웃 등)
 * - 자동 재시도 메커니즘 (지수 백오프)
 * - 세션 자동 갱신 로직
 *
 * @returns 인증 관련 상태와 함수들
 */
export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loadingState: LoadingState.INITIALIZING,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // 재시도 전략 인스턴스
  const profileRetryStrategy = useRef(new AuthRetryStrategy(3, 1000, 2, 0.2));
  const sessionRetryStrategy = useRef(new AuthRetryStrategy(2, 500, 1.5, 0.1));

  // 프로필 조회 헬퍼 함수 (pipe 활용)
  const executeProfileQuery = useCallback(async (userId: string) => {
    return pipe(
      (id: string) => ({ userId: id }),
      async ({ userId }) => {
        const { data, error } = await supabase.from('profile').select('*').eq('id', userId).single();
        if (error) throw error;
        return data;
      }
    )(userId);
  }, []);

  // 재시도 로직이 포함된 프로필 조회
  const fetchUserProfile = useCallback(
    async (userId: string): Promise<PartialProfile | null> => {
      const strategy = profileRetryStrategy.current;
      let lastError: unknown;
      let attempt = 1;

      while (strategy.shouldRetry(attempt, lastError)) {
        try {
          const data = await executeProfileQuery(userId);
          return data;
        } catch (error) {
          lastError = error;
          console.error(`프로필 조회 실패 (시도 ${attempt}):`, error);

          // 다음 시도가 가능한지 확인
          if (strategy.shouldRetry(attempt + 1, error)) {
            const delay = strategy.getDelay(attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
            continue;
          }

          break;
        }
      }

      // 모든 재시도 실패 시 에러 설정 (pipe 활용)
      const authError = processAuthError(lastError);
      setAuthState(prev => ({ ...prev, error: authError }));
      return null;
    },
    [executeProfileQuery]
  );

  // 세션 자동 갱신 설정
  const setupSessionRefresh = useCallback((session: Session) => {
    if (sessionRefreshTimeoutRef.current) {
      clearTimeout(sessionRefreshTimeoutRef.current);
    }

    // 토큰 만료 5분 전에 갱신 시도
    const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now() + 3600000;
    const refreshTime = expiresAt - Date.now() - 300000; // 5분 전

    if (refreshTime > 0) {
      sessionRefreshTimeoutRef.current = setTimeout(async () => {
        try {
          setAuthState(prev => ({ ...prev, loadingState: LoadingState.REFRESHING_SESSION }));
          const { error } = await supabase.auth.refreshSession();

          if (error) {
            console.error('세션 갱신 실패:', error);
            setAuthState(prev => ({
              ...prev,
              loadingState: LoadingState.IDLE,
              error: createAuthError(AuthErrorType.SESSION_ERROR, '세션 갱신에 실패했습니다.', error, true),
            }));
          } else {
            setAuthState(prev => ({ ...prev, loadingState: LoadingState.IDLE, error: null }));
          }
        } catch (error) {
          console.error('세션 갱신 중 오류:', error);
          setAuthState(prev => ({
            ...prev,
            loadingState: LoadingState.IDLE,
            error: createAuthError(AuthErrorType.SESSION_ERROR, '세션 갱신 중 오류가 발생했습니다.', error, true),
          }));
        }
      }, refreshTime);
    }
  }, []);

  // 인증 상태 변경 처리
  const handleAuthChange = useCallback(
    async (event: AuthChangeEvent, session: Session | null) => {
      try {
        console.log('Auth state changed:', event, session?.user?.id);

        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              setAuthState(prev => ({ ...prev, loadingState: LoadingState.REFRESHING_PROFILE }));
              const profile = await fetchUserProfile(session.user.id);

              if (profile) {
                setupSessionRefresh(session);
                setAuthState({
                  user: profile,
                  loadingState: LoadingState.IDLE,
                  error: null,
                });
              } else {
                setAuthState({
                  user: null,
                  loadingState: LoadingState.IDLE,
                  error: createAuthError(AuthErrorType.PROFILE_ERROR, '사용자 프로필을 찾을 수 없습니다.'),
                });
              }
            }
            break;

          case 'SIGNED_OUT':
            if (sessionRefreshTimeoutRef.current) {
              clearTimeout(sessionRefreshTimeoutRef.current);
            }
            setAuthState({
              user: null,
              loadingState: LoadingState.IDLE,
              error: null,
            });
            break;

          case 'TOKEN_REFRESHED':
            if (session?.user) {
              setupSessionRefresh(session);
              const profile = await fetchUserProfile(session.user.id);
              if (profile) {
                setAuthState(prev => ({
                  ...prev,
                  user: profile,
                  loadingState: LoadingState.IDLE,
                  error: null,
                }));
              }
            }
            break;

          case 'USER_UPDATED':
            if (session?.user) {
              const profile = await fetchUserProfile(session.user.id);
              if (profile) {
                setAuthState(prev => ({ ...prev, user: profile }));
              }
            }
            break;

          default:
            break;
        }
      } catch (error) {
        console.error('인증 상태 변경 처리 실패:', error);
        const authError = isNetworkError(error)
          ? createAuthError(AuthErrorType.NETWORK_ERROR, '네트워크 연결을 확인해주세요.', error, true)
          : createAuthError(AuthErrorType.UNKNOWN_ERROR, '인증 상태 처리 중 오류가 발생했습니다.', error);

        setAuthState({
          user: null,
          loadingState: LoadingState.IDLE,
          error: authError,
        });
      }
    },
    [fetchUserProfile, setupSessionRefresh]
  );

  // 초기 세션 확인 (재시도 로직 포함)
  const checkInitialSession = useCallback(async () => {
    const strategy = sessionRetryStrategy.current;
    let lastError: unknown;
    let attempt = 1;

    while (strategy.shouldRetry(attempt, lastError)) {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (session?.user) {
          setAuthState(prev => ({ ...prev, loadingState: LoadingState.REFRESHING_PROFILE }));
          const profile = await fetchUserProfile(session.user.id);

          if (profile) {
            setupSessionRefresh(session);
            setAuthState({
              user: profile,
              loadingState: LoadingState.IDLE,
              error: null,
            });
          } else {
            setAuthState({
              user: null,
              loadingState: LoadingState.IDLE,
              error: createAuthError(AuthErrorType.PROFILE_ERROR, '사용자 프로필을 찾을 수 없습니다.'),
            });
          }
        } else {
          setAuthState({
            user: null,
            loadingState: LoadingState.IDLE,
            error: null,
          });
        }
        return; // 성공 시 함수 종료
      } catch (error) {
        lastError = error;
        console.error(`초기 세션 확인 실패 (시도 ${attempt}):`, error);

        // 다음 시도가 가능한지 확인
        if (strategy.shouldRetry(attempt + 1, error)) {
          const delay = strategy.getDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
          continue;
        }

        break;
      }
    }

    // 모든 재시도 실패 시 (pipe 활용)
    const authError = processSessionError(lastError);
    setAuthState({
      user: null,
      loadingState: LoadingState.IDLE,
      error: authError,
    });
  }, [fetchUserProfile, setupSessionRefresh]);

  // 로그인 (재시도 로직 포함)
  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loadingState: LoadingState.SIGNING_IN, error: null }));

    const strategy = sessionRetryStrategy.current;
    let lastError: unknown;
    let attempt = 1;

    while (strategy.shouldRetry(attempt, lastError)) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // 인증 에러는 재시도하지 않음 (AuthRetryStrategy에서 처리)
          const authError = createAuthError(AuthErrorType.AUTH_ERROR, error.message, error);
          setAuthState(prev => ({
            ...prev,
            loadingState: LoadingState.IDLE,
            error: authError,
          }));
          throw authError;
        }

        // 성공 시 onAuthStateChange에서 처리
        return { success: true };
      } catch (error) {
        lastError = error;
        console.error(`로그인 실패 (시도 ${attempt}):`, error);

        // 다음 시도가 가능한지 확인 (AuthRetryStrategy가 인증 에러는 자동으로 거부)
        if (strategy.shouldRetry(attempt + 1, error)) {
          const delay = strategy.getDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
          continue;
        }

        break;
      }
    }

    // 모든 재시도 실패 (pipe 활용)
    const authError = pipe(
      (error: unknown) => ({ error, isNetwork: isNetworkError(error) }),
      pipeIf(
        ({ isNetwork }) => isNetwork,
        ({ error }) => createAuthError(AuthErrorType.NETWORK_ERROR, '네트워크 연결을 확인해주세요.', error, true),
        ({ error }) => createAuthError(AuthErrorType.AUTH_ERROR, '로그인에 실패했습니다.', error)
      )
    )(lastError);

    setAuthState(prev => ({
      ...prev,
      loadingState: LoadingState.IDLE,
      error: authError,
    }));

    throw authError;
  }, []);

  // 로그아웃
  const logout = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, loadingState: LoadingState.SIGNING_OUT, error: null }));

      if (sessionRefreshTimeoutRef.current) {
        clearTimeout(sessionRefreshTimeoutRef.current);
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        const authError = createAuthError(AuthErrorType.AUTH_ERROR, error.message, error);
        setAuthState(prev => ({
          ...prev,
          loadingState: LoadingState.IDLE,
          error: authError,
        }));
        throw authError;
      }

      return { success: true };
    } catch (error) {
      console.error('로그아웃 중 오류:', error);
      throw error;
    }
  }, []);

  // 사용자 정보 새로고침
  const refreshUser = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, loadingState: LoadingState.REFRESHING_PROFILE, error: null }));

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        const authError = createAuthError(
          AuthErrorType.SESSION_ERROR,
          error?.message || '사용자 정보를 찾을 수 없습니다.',
          error
        );
        setAuthState({
          user: null,
          loadingState: LoadingState.IDLE,
          error: authError,
        });
        return;
      }

      const profile = await fetchUserProfile(user.id);
      setAuthState({
        user: profile,
        loadingState: LoadingState.IDLE,
        error: profile ? null : createAuthError(AuthErrorType.PROFILE_ERROR, '사용자 프로필을 찾을 수 없습니다.'),
      });
    } catch (error) {
      console.error('사용자 정보 새로고침 실패:', error);
      const authError = isNetworkError(error)
        ? createAuthError(AuthErrorType.NETWORK_ERROR, '네트워크 연결을 확인해주세요.', error, true)
        : createAuthError(AuthErrorType.UNKNOWN_ERROR, '사용자 정보 새로고침 중 오류가 발생했습니다.', error);

      setAuthState(prev => ({
        ...prev,
        loadingState: LoadingState.IDLE,
        error: authError,
      }));
    }
  }, [fetchUserProfile]);

  // 에러 재시도 함수
  const retryLastOperation = useCallback(async () => {
    if (!authState.error?.retryable) return;

    // 현재 에러 타입에 따라 적절한 재시도 수행
    switch (authState.error.type) {
      case AuthErrorType.NETWORK_ERROR:
      case AuthErrorType.SESSION_ERROR:
        await checkInitialSession();
        break;
      case AuthErrorType.PROFILE_ERROR:
        await refreshUser();
        break;
      default:
        break;
    }
  }, [authState.error, checkInitialSession, refreshUser]);

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    console.log('인증 시스템 초기화 시작');

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    // 초기 세션 확인
    checkInitialSession();

    // 인증 상태 변경 리스너 등록
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION은 checkInitialSession에서 처리하므로 무시
      if (event !== 'INITIAL_SESSION') {
        handleAuthChange(event, session);
      }
    });

    return () => {
      console.log('인증 시스템 정리');
      subscription.unsubscribe();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (sessionRefreshTimeoutRef.current) {
        clearTimeout(sessionRefreshTimeoutRef.current);
      }
    };
  }, [checkInitialSession, handleAuthChange]);

  return {
    user: authState.user,
    isLoading: authState.loadingState !== LoadingState.IDLE,
    loadingState: authState.loadingState,
    error: authState.error,
    login,
    logout,
    refreshUser,
    retryLastOperation,
  };
};
