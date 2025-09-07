import supabase, { type PartialProfile } from '@/lib/supabase';

/**
 * 사용자 프로필 정보를 업데이트합니다.
 *
 * @param profileData - 업데이트할 프로필 데이터
 * @returns 업데이트된 프로필 데이터
 * @throws 프로필 업데이트 과정에서 오류가 발생한 경우
 */
export const updateProfile = async (profileData: Partial<PartialProfile>) => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const { data, error } = await supabase.from('profile').update(profileData).eq('id', user.id).select().single();

    if (error) {
      throw error;
    }

    return { success: true, data, message: '프로필이 성공적으로 업데이트되었습니다.' };
  } catch (error) {
    console.error('프로필 업데이트 실패:', error);
    throw error;
  }
};
