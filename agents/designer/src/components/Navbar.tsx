import Link from "next/link";

export const Navbar = () => (
  <nav className="flex items-center justify-between p-4 border-b bg-background/95">
    <div className="flex gap-4 items-center">
      <Link href="/" className="text-lg font-bold tracking-tight">TestProjet</Link>
      <Link href="/items" className="text-muted-foreground hover:text-foreground">Items</Link>
      <Link href="/about" className="text-muted-foreground hover:text-foreground">About</Link>
    </div>
  </nav>
);
