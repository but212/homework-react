import { Link, Outlet, Route, Routes } from 'react-router-dom';

import Home from './home';
import Profile from './profile';
import SignIn from './sign-in';
import SignUp from './sign-up';

import { useAuth } from '@/hooks';
import { cn } from '@/lib/utils';

const Week4 = () => {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <>
        <title>Week 4</title>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">인증 상태를 확인하는 중...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <title>Week 4</title>
      <nav className={cn('flex', 'gap-4', 'm-4')}>
        <Link to='/week-4/home' aria-label='홈' className='p-2 rounded hover:bg-gray-200 transition'>
          홈
        </Link>
        {user ? (
          <>
            <Link to='/week-4/profile' aria-label='프로필' className='p-2 rounded hover:bg-gray-200 transition'>
              프로필
            </Link>
            <button
              type='button'
              onClick={() => logout()}
              className='p-2 bg-gray-200 rounded hover:bg-gray-300 transition'
            >
              로그아웃
            </button>
          </>
        ) : (
          <>
            <Link to='/week-4/sign-up' aria-label='회원가입' className='p-2 rounded hover:bg-gray-200 transition'>
              회원가입
            </Link>
            <Link to='/week-4/sign-in' className='p-2 rounded hover:bg-gray-200 transition'>
              로그인
            </Link>
          </>
        )}
      </nav>
      <Routes>
        <Route path='home' element={<Home user={user} />} />
        <Route path='sign-in' element={<SignIn />} />
        <Route path='sign-up' element={<SignUp />} />
        <Route path='profile' element={<Profile user={user} />} />
      </Routes>
      <Outlet />
    </>
  );
};

export default Week4;
