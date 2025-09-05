import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <>
      <h1>Home</h1>
      <ul className={cn('flex', 'flex-col', 'gap-4', 'm-4')}>
        <li><Link to='/week-3'>Week 3</Link></li>
        <li><Link to='/week-4'>Week 4</Link></li>
      </ul>
    </>
  );
};

export default Home;
