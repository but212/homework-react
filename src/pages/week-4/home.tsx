import type { PartialProfile } from '@/lib/supabase';
import { cn } from '@/lib/utils';


const Home = ({ user }: { user: PartialProfile | null }) => {
  return (
    <div className={cn( 'mx-auto', 'mt-10', 'bg-white', 'rounded-lg', 'shadow-lg', 'p-8', 'flex', 'flex-col', 'gap-6', 'm-4')}>
      <h1 className={cn('text-4xl', 'font-bold')}>홈</h1>
      {user ? <p className={cn('text-lg')}>{user.user_name}</p> : <p>로그인하지 않았습니다.</p>}
    </div>
  );
};

export default Home;
