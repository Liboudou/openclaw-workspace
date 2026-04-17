import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <section className="flex flex-col gap-6 items-center justify-center h-[60vh] text-center">
      <h1 className="text-4xl font-extrabold tracking-tight">Bienvenue sur TestProjet!</h1>
      <div className="flex gap-4">
        <Link href="/items">
          <Button>Voir les items</Button>
        </Link>
        <Link href="/about">
          <Button variant="outline">À propos</Button>
        </Link>
      </div>
    </section>
  );
}
