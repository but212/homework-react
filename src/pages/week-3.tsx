import { Link } from 'react-router-dom';

import SearchCardList from '@/components/SearchCardList/SearchCardList';
import { cn } from '@/lib/utils';

const Week3 = () => {
  return (
    <>
      <div className={cn('flex', 'justify-between', 'm-4')}>
        <h1>Week 3</h1>
        <Link to='/'>Home</Link>
      </div>

      <SearchCardList />
    </>
  );
};

export default Week3;
