import supabase from '@/lib/supabase';

/**
 * 사용자 계정을 완전히 삭제합니다.
 * 프로필 데이터를 먼저 삭제한 후 사용자 계정을 삭제합니다.
 *
 * @returns 삭제 성공 시 success: true를 반환
 * @throws 사용자를 찾을 수 없거나 삭제 과정에서 오류가 발생한 경우
 */
export const deleteUserAccount = async () => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const { error: profileError } = await supabase.from('profile').delete().eq('id', user.id);

    if (profileError) {
      throw profileError;
    }

    const { error: deleteError } = await supabase.rpc('delete_user');

    if (deleteError) {
      throw deleteError;
    }

    return { success: true };
  } catch (error) {
    console.error('계정 삭제 실패:', error);
    throw error;
  }
};
