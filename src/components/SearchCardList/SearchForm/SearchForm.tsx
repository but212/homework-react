import { useEffect, useMemo, useState } from 'react';

import { debounce } from '@/lib/utils';

interface SearchFormProps {
  onSearch: (query: string) => void;
  searchQuery: string;
}

const SearchForm = ({ onSearch, searchQuery }: SearchFormProps) => {
  const [inputValue, setInputValue] = useState(searchQuery);

  const debouncedSearch = useMemo(
    () =>
      debounce((...args: unknown[]) => {
        onSearch(args[0] as string);
      }, 300),
    [onSearch]
  );

  useEffect(() => {
    debouncedSearch(inputValue);
  }, [inputValue, debouncedSearch]);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    debouncedSearch.cancel();
    onSearch(inputValue);
  };

  return (
    <form className='search-form flex justify-between gap-1' onSubmit={handleSubmit}>
      <label htmlFor='search' className='flex items-center'>
        검색어
      </label>
      <input
        type='text'
        id='search'
        name='search'
        className='w-3/4'
        placeholder='검색어를 입력해주세요'
        value={inputValue}
        onChange={handleInputChange}
      />
      <button type='submit' className='inline-block p-4 bg-blue-500 text-white font-semibold rounded-2xl'>
        검색
      </button>
    </form>
  );
};

export default SearchForm;
