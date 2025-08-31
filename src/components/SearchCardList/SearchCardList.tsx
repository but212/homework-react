import { cn } from '@/lib/utils';
import { useCallback, useState } from 'react';
import data from '../../dummy_data/week3/data.json';
import { type CardData } from '../../lib/week3/card-data';
import searchCards from '../../lib/week3/search-cards';
import './SearchCardList.css';
import SearchForm from './SearchForm/SearchForm';
import SearchedList from './SearchedList/SearchedList';

const SearchCardList = () => {
  const [allCards] = useState<CardData[]>(data);
  const [filteredCards, setFilteredCards] = useState<CardData[]>(data);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    const results = searchCards(query, allCards);
    setFilteredCards(results);
  }, [allCards]);

  return (
    <div className={cn('flex', 'flex-col', 'gap-4', 'w-1/2', "justify-self-center")}>
      <SearchForm onSearch={handleSearch} searchQuery={searchQuery} />
      <SearchedList cards={filteredCards} />
    </div>
  );
};

export default SearchCardList;
