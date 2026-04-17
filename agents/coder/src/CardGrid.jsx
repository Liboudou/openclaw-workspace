import React from "react";
import famousCards from "./famousCards";

export default function CardGrid() {
  return (
    <section className="card-grid" aria-label="Liste des cartes Yu-Gi-Oh! célèbres">
      {famousCards.map((card) => (
        <article className="card" key={card.name} tabIndex={0} aria-label={card.name}>
          <img className="card-img" src={card.image} alt={card.name} loading="lazy" />
          <div className="card-content">
            <h2 className="card-title">{card.name}</h2>
            <p className="card-type">{card.type}</p>
            <p className="card-desc">{card.description}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
