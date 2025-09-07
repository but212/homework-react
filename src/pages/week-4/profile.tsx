import { useNavigate } from 'react-router-dom';

import { type PartialProfile } from '@/lib/supabase';

interface Props {
  user: PartialProfile | null;
}

export default function ProfilePage({ user }: Props) {
  const navigate = useNavigate();
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
          <button
            onClick={async () => {
              navigate('/week-4/profile');
            }}
            className='w-2/5 mt-4 bg-gray-200 py-2 rounded hover:bg-gray-300 transition'
          >
            계정 수정
          </button>
          <button
            onClick={async () => {
              navigate('/week-4/home');
            }}
            className='w-2/5 mt-4 bg-red-500 py-2 rounded hover:bg-red-600 transition'
          >
            계정삭제
          </button>
        </div>
      ) : (
        <div className='text-center text-gray-500'>프로필을 보려면 로그인이 필요합니다.</div>
      )}
    </div>
  );
}
