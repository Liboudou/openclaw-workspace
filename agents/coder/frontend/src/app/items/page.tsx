import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import ItemCard from '../../components/ItemCard';

export default function ItemsPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch('/api/items')
      .then((res) => res.json())
      .then((data) => setItems(data ?? []));
  }, []);

  return (
    <div>
      <Navbar />
      <main style={{padding: 24}}>
        <h1>Liste des items</h1>
        {items.length === 0 && <p>Aucun item disponible.</p>}
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 12}}>
          {items.map((item: any) => <ItemCard key={item.id} item={item} />)}
        </div>
      </main>
    </div>
  );
}
