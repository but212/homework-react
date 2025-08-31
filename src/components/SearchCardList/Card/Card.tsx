import { type CardData } from '../../../lib/week3/card-data';
import './Card.css';

const Card = ({ card }: { card: CardData }) => {
  return (
    <>
      <p>{card.title}</p>
      <p>{card.description}</p>
      <img src={card.image} alt={card.title} />
    </>
  );
};

export default Card;
