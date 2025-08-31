# 3주차 회고

## 검색 카드 리스트 구현

검색 카드 리스트를 구현하는 과제를 받았습니다.

### 일단 페이지 변환부터

week3 페이지를 html로 구성했으나 정상적으로 작동하지 않아서 그냥 spa로 구성하고자 어떻게 구성하는지 알아봤습니다.
리액트에서 싱글 페이지 변환을 하기 위해서는 react-router-dom을 사용해야 한다고 알아봤습니다.
일단 App의 내부요소 들을 BrowserRouter로 감싸고 Routes와 Route를 사용하여 페이지를 구성했습니다.

```tsx
const App = ({ title }: { title: string }) => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/week-3' element={<Week3 />} />
      </Routes>
    </BrowserRouter>
  );
};
```

그리고 Home과 Week3 페이지를 구성하는데 Link를 사용하여 페이지를 이동할 수 있도록 구성했습니다.

```tsx
const Home = () => {
  return (
    <div>
      <h1>Home</h1>
      <Link to='/week-3'>Week 3</Link>
    </div>
  );
};
```

### SearchCardList 구현

Card, SearchForm, SearchedList 구성요소를 구성했으며 인터페이스 기반의 검색 알고리즘을 구현했습니다.

```ts
// src/lib/week3/card-data.ts
interface CardData {
  id: number;
  title: string;
  description: string;
  tags: string[];
  image: string;
}

// src/lib/week3/search-cards.ts
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
```

이렇게 구현한 검색 알고리즘을 사용하여 SearchCardList를 구성했습니다.

```tsx
// src/components/SearchCardList/SearchCardList.tsx
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
```

그리고 디바운싱을 활용하여 검색어를 입력할 때마다 너무 자주 검색을 하지 않도록 구현했습니다.

```tsx
const SearchForm = ({ onSearch, searchQuery }: SearchFormProps) => {
  const [inputValue, setInputValue] = useState(searchQuery);

  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        onSearch(query);
      }, 300),
    [onSearch]
  );

  useEffect(() => {
    debouncedSearch(inputValue);
  }, [inputValue]);

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
```

## 느낀점

디바운싱을 통한 최적화를 구현하고 스타일링과 컴포넌트 조립을 하면서 기능을 리액트 컴포넌트에 연결하는 방법을 배운것 같습니다.
