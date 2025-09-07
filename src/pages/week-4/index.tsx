import { useEffect, useState } from 'react';
import { Link, Outlet, Route, Routes } from 'react-router-dom';
import { toast } from 'sonner';

import Home from './home';
import Profile from './profile';
import SignIn from './sign-in';
import SignUp from './sign-up';

import supabase, { type PartialProfile } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const Week4 = () => {
  const [user, setUser] = useState<PartialProfile | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('세션 확인 오류:', error.message);
        return;
      }

      if (session?.user) {
        const { error: userProfileError, data: userProfile } = await supabase
          .from('profile')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userProfileError) {
          toast.error(`사용자 프로필 오류: ${userProfileError.message}`);
        } else {
          setUser(userProfile);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      switch (event) {
        case 'SIGNED_IN':
          if (session?.user) {
            const { error: userProfileError, data: userProfile } = await supabase
              .from('profile')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (userProfileError) {
              toast.error(`사용자 프로필 오류: ${userProfileError.message}`);
            } else {
              setUser(userProfile);
            }
          }
          break;
        case 'SIGNED_OUT':
          setUser(null);
          break;
        default:
          break;
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <title>Week 4</title>
      <nav className={cn('flex', 'gap-4', 'm-4')}>
        <Link to='/week-4/home' aria-label='홈'>
          홈
        </Link>
        <Link to='/week-4/sign-up' aria-label='회원가입'>
          회원가입
        </Link>
        {user ? (
          <>
            <Link to='/week-4/profile'>프로필</Link>
            <button type='button' onClick={() => supabase.auth.signOut()}>
              로그아웃
            </button>
          </>
        ) : (
          <Link to='/week-4/sign-in'>로그인</Link>
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
