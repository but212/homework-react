import "./SearchForm.css";

const SearchForm = () => {
  return (
    <form className="search-form">
      <label htmlFor="search">Search:</label>
      <input type="text" id="search" name="search" />
      <button type="submit">Search</button>
    </form>
  );
};

export default SearchForm;
