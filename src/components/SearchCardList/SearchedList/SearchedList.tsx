import { type CardData } from "../../../lib/week3/card-data";
import Card from "../Card/Card";
import "./SearchedList.css";

const SearchedList = ({ cards }: { cards: CardData[] }) => {
    return (
        <>
            {cards.map((card) => (
                <Card key={card.id} card={card} />
            ))}
        </>
    )
}

export default SearchedList
