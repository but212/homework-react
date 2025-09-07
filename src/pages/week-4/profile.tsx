import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import EditProfileModal from '@/components/EditProfileModal';
import { useToggleState } from '@/hooks';
import { type PartialProfile } from '@/lib/supabase';
import { deleteUserAccount } from '@/lib/utils/auth';

interface Props {
  user: PartialProfile | null;
}

export default function ProfilePage({ user }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, toggleEditModal] = useToggleState(false);
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    if (!confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      setIsDeleting(true);
      console.log('계정 삭제 시작...');
      await deleteUserAccount();
      console.log('계정 삭제 성공');
      alert('계정이 성공적으로 삭제되었습니다.');
      navigate('/');
    } catch (error) {
      console.error('계정 삭제 실패:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`계정 삭제에 실패했습니다. 오류: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };
  return (
    <div className='mx-4 mt-10 bg-white rounded-lg shadow-lg p-8'>
      <h2 className='text-xl font-bold mb-6 text-center'>프로필</h2>
      {user ? (
        <div>
          <div className='mb-2'>
            <span className='font-medium'>이름:</span> {user.user_name || '-'}
          </div>
          <div className='mb-2'>
            <span className='font-medium'>이메일:</span> {user.email}
          </div>
          <div className='flex justify-between gap-4'>
            <button
              onClick={() => {
                toggleEditModal.on();
              }}
              className='w-full mt-4 bg-gray-200 py-2 rounded hover:bg-gray-300 transition'
            >
              계정 수정
            </button>
            <button
              onClick={handleDeleteAccount}
              className='w-full mt-4 bg-red-500 py-2 rounded hover:bg-red-600 transition text-white'
            >
              {isDeleting ? '계정 삭제 중...' : '계정 삭제'}
            </button>
          </div>
        </div>
      ) : (
        <div className='text-center text-gray-500'>프로필을 보려면 로그인이 필요합니다.</div>
      )}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => {
          toggleEditModal.off();
        }}
        user={user}
      />
    </div>
  );
}
