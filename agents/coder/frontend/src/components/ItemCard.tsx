export default function ItemCard({ item }: { item: any }) {
  return (
    <div style={{border:'1px solid #DDD', borderRadius:8, padding:16, minWidth:200}}>
      <h3 style={{marginBottom:8}}>{item.name}</h3>
      <p>{item.description ?? '(aucune description)'}</p>
    </div>
  );
}
