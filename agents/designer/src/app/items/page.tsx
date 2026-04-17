import { useEffect, useState } from "react";
import { ItemCard } from "@/components/ItemCard";
import { ItemFormModal } from "@/components/ItemFormModal";
import { Loader } from "@/components/ui/loader";
import { ErrorBanner } from "@/components/ui/error-banner";

interface Item {
  id: string;
  name: string;
  description: string;
  tag?: string;
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/items", { cache: "no-store" });
      if (!res.ok) throw new Error("Erreur d'API");
      const data = await res.json();
      setItems(data.items ?? data);
    } catch (e: any) {
      setError(e.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleAdd = async (item: Omit<Item, "id">) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error("Erreur d'ajout d'item");
      await fetchItems();
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'ajout");
      setLoading(false);
    }
  };

  return (
    <section className="py-4 flex flex-col gap-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Items</h2>
        <ItemFormModal onSubmit={handleAdd} triggerLabel="Ajouter" />
      </div>
      {loading && <Loader />}
      {error && <ErrorBanner message={error} />}
      {!loading && !error && (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {items.length === 0 && <div>Aucun item.</div>}
          {items.map((item) => <ItemCard key={item.id} item={item} />)}
        </div>
      )}
    </section>
  );
}
