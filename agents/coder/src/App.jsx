import React from "react";
import CardGrid from "./CardGrid";

export default function App() {
  return (
    <main className="container">
      <h1 className="title">Cartes Yu-Gi-Oh! les plus célèbres</h1>
      <CardGrid />
      <footer className="footer">© 2026 Liboudou &bull; Purement in-memory</footer>
    </main>
  );
}
