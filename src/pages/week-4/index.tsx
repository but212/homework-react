import supabase, { type PartialProfile } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, Outlet, Route, Routes } from 'react-router-dom';
import SignIn from './sign-in';
import SignUp from './sign-up';

const Week4 = () => {
  const [user, setUser] = useState<PartialProfile | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ error, data }) => {
      if (error) {
        toast.error(`사용자 검색 오류: ${error.message}`);
      } else {
        const { error: userProfileError, data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userProfileError) {
          toast.error(`사용자 프로필 오류: ${userProfileError.message}`);
        } else {
          setUser(userProfile);
        }
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(event => {
      switch (event) {
        case 'SIGNED_IN':
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
        <Link to='/week-4/sign-up'>Sign Up</Link>
        {user ? <button type='button'>Sign Out</button> : <Link to='/week-4/sign-in'>Sign In</Link>}
      </nav>
      <Routes>
        <Route path='sign-in' element={<SignIn />} />
        <Route path='sign-up' element={<SignUp />} />
      </Routes>
      <Outlet />
    </>
  );
};

export default Week4;
