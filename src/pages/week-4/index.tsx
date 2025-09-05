import { type PartialProfile } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Link, Outlet, Route, Routes } from 'react-router-dom';
import SignIn from './sign-in';
import SignUp from './sign-up';

const Week4 = () => {
  const [userData, setUserData] = useState<PartialProfile | null>(null);

  return (
    <>
      <title>Week 4</title>
      <nav className={cn('flex', 'gap-4', 'm-4')}>
        <Link to='/week-4/sign-up'>Sign Up</Link>
        {userData ? (
          <button type="button">Sign Out</button>
        ) : (
          <button type="button">Sign In</button>
        )}
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
