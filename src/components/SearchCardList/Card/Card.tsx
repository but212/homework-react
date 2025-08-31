import { cn } from '@/lib/utils';
import { type CardData } from '../../../lib/week3/card-data';
import './Card.css';

const Card = ({ card }: { card: CardData }) => {
  return (
    <article className={cn('card', 'flex', 'flex-row', 'items-center', 'gap-8', "min-w-[500px]")}>
      <img src={card.image} alt={card.title} className='w-[64px]' />
      <div role='group' className={cn('flex', 'flex-col', 'gap-2', "w-full")} aria-labelledby={card.title}>
        <p className='font-semibold'>{card.title}</p>
        <p>{card.description}</p>
        <ul className='flex gap-2'>
          {card.tags.map(tag => (
            <li className='bg-gray-200 p-1 rounded' key={tag}>
              {tag}
            </li>
          ))}
        </ul>
      </div>
      <button type='button' className='bg-gray-700 text-white font-semibold rounded-2xl p-4 justify-self-end object-contain w-48'>
        배우러가기
      </button>
    </article>
  );
};

export default Card;
