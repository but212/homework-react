import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import supabase, { type PartialProfile } from '@/lib/supabase';

interface Props {
  user: PartialProfile | null;
}

export default function ProfilePage({ user }: Props) {
    const navigate = useNavigate();
  return (
    <div className='max-w-md mx-auto mt-10 bg-white rounded-lg shadow-lg p-8'>
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
              // [실습] Supabase 로그아웃
              const { error } = await supabase.auth.signOut();

              if (error) {
                toast('로그아웃 실패' + error.message);
              } else {
                toast('로그아웃 되었습니다.');
                navigate('signin');
              }
            }}
            className='w-full mt-4 bg-gray-200 py-2 rounded hover:bg-gray-300 transition'
          >
            로그아웃
          </button>
        </div>
      ) : (
        <div className='text-center text-gray-500'>프로필을 보려면 로그인이 필요합니다.</div>
      )}
    </div>
  );
}
