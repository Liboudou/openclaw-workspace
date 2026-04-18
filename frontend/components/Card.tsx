const Card = ({ cardData }: { cardData: { id: string; name: string; description: string } }) => (
  <div>
    <h2>{cardData.name}</h2>
    <p>{cardData.description}</p>
  </div>
);

export default Card;