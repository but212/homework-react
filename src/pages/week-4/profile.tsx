import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import EditProfileModal from '@/components/EditProfileModal';
import { useAuth, useToggleState } from '@/hooks';
import { deleteUserAccount } from '@/lib/utils/auth';

export default function ProfilePage() {
  const { user, isLoading, error } = useAuth();
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
  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className='mx-4 mt-10 bg-white rounded-lg shadow-lg p-8'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>프로필을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 사용자
  if (!user) {
    return (
      <div className='mx-4 mt-10 bg-white rounded-lg shadow-lg p-8'>
        <h2 className='text-xl font-bold mb-6 text-center'>프로필</h2>
        <div className='text-center'>
          <div className='text-gray-500 mb-4'>프로필을 보려면 로그인이 필요합니다.</div>
          {error && (
            <div className='p-3 bg-red-100 border border-red-400 text-red-700 rounded mb-4'>{error.message}</div>
          )}
          <button
            onClick={() => navigate('/week-4/sign-in')}
            className='bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition'
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='mx-4 mt-10 bg-white rounded-lg shadow-lg p-8'>
      <h2 className='text-xl font-bold mb-6 text-center'>프로필</h2>
      {error && (
        <div className='mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded'>
          <div className='flex justify-between items-center'>
            <span>{error.message}</span>
            {error.retryable && (
              <button
                onClick={() => window.location.reload()}
                className='ml-2 px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700'
              >
                재시도
              </button>
            )}
          </div>
        </div>
      )}
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
            disabled={isDeleting}
            className='w-full mt-4 bg-red-500 py-2 rounded hover:bg-red-600 transition text-white disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {isDeleting ? '계정 삭제 중...' : '계정 삭제'}
          </button>
        </div>
      </div>
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
