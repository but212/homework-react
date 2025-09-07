import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import supabase, { type PartialProfile } from '@/lib/supabase';

/**
 * 사용자 인증 상태를 관리하는 커스텀 훅
 * Supabase 세션을 기반으로 인증 상태를 관리합니다.
 *
 * @returns 인증 관련 상태와 함수들
 * - user: 현재 로그인된 사용자 정보
 * - isLoading: 인증 상태 로딩 여부
 * - login: 로그인 함수
 * - logout: 로그아웃 함수
 * - refreshUser: 사용자 정보 새로고침 함수
 */
export const useAuth = () => {
  const [user, setUser] = useState<PartialProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUserProfile = useCallback(async (userId: string): Promise<PartialProfile | null> => {
    try {
      const { error: userProfileError, data: userProfile } = await supabase
        .from('profile')
        .select('*')
        .eq('id', userId)
        .single();

      if (userProfileError) {
        console.error('사용자 프로필 오류:', userProfileError.message);
        toast.error(`사용자 프로필 오류: ${userProfileError.message}`);
        return null;
      }

      return userProfile;
    } catch (error) {
      console.error('프로필 조회 실패:', error);
      return null;
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);

      try {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error(`로그인 오류 발생 ${error.message}`);
          return { success: false, error: error.message };
        }

        if (data.user) {
          const profile = await fetchUserProfile(data.user.id);

          if (profile) {
            setUser(profile);
            const displayName = profile.user_name || data.user.user_metadata?.name || '사용자';
            toast.success(`로그인 성공 ${displayName}`);
            return { success: true, user: profile };
          }
        }

        return { success: false, error: '사용자 정보를 가져올 수 없습니다.' };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        toast.error(`로그인 실패: ${errorMessage}`);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [fetchUserProfile, setUser]
  );

  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error(`로그아웃 실패: ${error.message}`);
        return { success: false, error: error.message };
      }

      // 사용자 상태 제거
      setUser(null);
      toast.success('로그아웃 되었습니다.');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      toast.error(`로그아웃 실패: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        console.error('사용자 세션 확인 실패:', userError?.message);
        return;
      }

      const profile = await fetchUserProfile(currentUser.id);
      if (profile) {
        setUser(profile);
      }
    } catch (error) {
      console.error('사용자 정보 새로고침 실패:', error);
    }
  }, [fetchUserProfile, setUser]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('세션 확인 오류:', error.message);
          setUser(null);
          return;
        }

        if (session?.user) {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError || !user) {
            console.error('사용자 세션 검증 실패:', userError?.message);
            setUser(null);
            return;
          }

          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            setUser(profile);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('인증 초기화 실패:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);

      switch (event) {
        case 'SIGNED_IN':
          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id);
            if (profile) {
              setUser(profile);
            }
          }
          setIsLoading(false);
          break;
        case 'SIGNED_OUT':
          setUser(null);
          setIsLoading(false);
          break;
        case 'TOKEN_REFRESHED':
          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id);
            if (profile) {
              setUser(profile);
            }
          }
          break;
        case 'USER_UPDATED':
          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id);
            if (profile) {
              setUser(profile);
            }
          }
          break;
        default:
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  return {
    user,
    isLoading,
    login,
    logout,
    refreshUser,
  };
};
