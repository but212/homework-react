import { type CardData } from '../../../lib/week3/card-data';
import Card from '../Card/Card';

const SearchedList = ({ cards }: { cards: CardData[] }) => {
  return (
    <ul className='flex flex-col gap-4'>
      {cards.map(card => (
        <li key={card.id}>
          <Card card={card} />
        </li>
      ))}
    </ul>
  );
};

export default SearchedList;
