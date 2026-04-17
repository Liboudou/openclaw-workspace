import Navbar from '../../components/Navbar';

export default function About() {
  return (
    <div>
      <Navbar />
      <main style={{padding: 24}}>
        <h1>À propos</h1>
        <p>Ce projet est une démonstration d’un monorepo Next.js/Express.<br/>
        Backend CRUD accessible via <code>http://localhost:3001/api/items</code>.</p>
      </main>
    </div>
  );
}
