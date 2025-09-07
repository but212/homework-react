import { useAuth } from '@/hooks';
import { cn } from '@/lib/utils';

const Home = () => {
  const { user, isLoading, error } = useAuth();

  return (
    <div
      className={cn(
        'mx-auto',
        'mt-10',
        'bg-white',
        'rounded-lg',
        'shadow-lg',
        'p-8',
        'flex',
        'flex-col',
        'gap-6',
        'm-4'
      )}
    >
      <h1 className={cn('text-4xl', 'font-bold')}>홈</h1>

      {isLoading ? (
        <div className='flex items-center gap-2'>
          <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600'></div>
          <p>인증 상태를 확인하는 중...</p>
        </div>
      ) : (
        <>
          {error && (
            <div className='p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded'>
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
          {user ? (
            <p className={cn('text-lg')}>{user.user_name || '사용자'}님 안녕하세요</p>
          ) : (
            <p>로그인하지 않았습니다.</p>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
