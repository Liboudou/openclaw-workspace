import Link from 'next/link';

export default function Navbar() {
  return (
    <nav style={{background:'#181824', color:'#fff', padding: '12px 32px', display:'flex', gap:32}}>
      <Link href="/">Accueil</Link>
      <Link href="/about">À propos</Link>
      <Link href="/items">Items</Link>
    </nav>
  );
}
