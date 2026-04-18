import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';

const HomePage = () => {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('http://localhost:3001/api/data');
      const data = await res.json();
      setCards(data.cards);
    };
    fetchData();
  }, []);

  return (
    <div>
      <Header siteTitle="Mini Next Express App" />
      <div>
        {cards.map((card: any) => (
          <Card key={card.id} cardData={card} />
        ))}
      </div>
    </div>
  );
};

export default HomePage;