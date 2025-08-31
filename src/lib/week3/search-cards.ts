import { type CardData } from './card-data';

const searchCards = (query: string, allCards: CardData[]): CardData[] => {
  if (!query.trim()) return allCards;

  const searchTerm = query.toLowerCase();

  return allCards.filter(
    card =>
      card.title.toLowerCase().includes(searchTerm) ||
      card.description.toLowerCase().includes(searchTerm) ||
      card.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  );
};

export default searchCards;
