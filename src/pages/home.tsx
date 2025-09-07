import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

const Home = () => {
  return (
    <>
      <h1>Home</h1>
      <ul className={cn('flex', 'flex-col', 'gap-4', 'm-4')}>
        <li>
          <Link to='/week-3'>Week 3</Link>
        </li>
        <li>
          <Link to='/week-4'>Week 4</Link>
        </li>
      </ul>

      <button onClick={() => toast.success('토스트 버튼 테스트')}>토스트버튼 테스트</button>
    </>
  );
};

export default Home;
