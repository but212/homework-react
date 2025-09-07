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

/**
 * 사용자의 이메일 주소를 변경합니다.
 * 새로운 이메일로 확인 메일이 발송됩니다.
 *
 * @param newEmail 변경할 새로운 이메일 주소
 * @returns 성공 시 success: true와 안내 메시지를 반환
 * @throws 이메일 변경 과정에서 오류가 발생한 경우
 */
export const updateUserEmail = async (newEmail: string) => {
  try {
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) {
      throw error;
    }

    return { success: true, message: '이메일 변경 확인 메일을 발송했습니다.' };
  } catch (error) {
    console.error('이메일 변경 실패:', error);
    throw error;
  }
};

/**
 * 사용자의 비밀번호를 변경합니다.
 *
 * @param newPassword 변경할 새로운 비밀번호
 * @returns 성공 시 success: true와 안내 메시지를 반환
 * @throws 비밀번호 변경 과정에서 오류가 발생한 경우
 */
export const updateUserPassword = async (newPassword: string) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }

    return { success: true, message: '비밀번호가 성공적으로 변경되었습니다.' };
  } catch (error) {
    console.error('비밀번호 변경 실패:', error);
    throw error;
  }
};
