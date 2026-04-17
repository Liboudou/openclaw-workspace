import React from "react";
export default function Navbar() {
  return (
    <nav className="w-full sticky top-0 z-50 bg-opacity-60 backdrop-blur transition">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-lg tracking-wider">ShadDemo</span>
        <div className="flex gap-4">
          <button className="rounded px-3 py-2 font-medium bg-accent text-accent-foreground shadow hover:scale-105 active:scale-95 transition-all">Accueil</button>
          <button className="rounded px-3 py-2 font-medium hover:bg-accent/40 transition">Découvrir</button>
          <button className="rounded px-3 py-2 font-medium hover:bg-accent/40 transition">Contact</button>
        </div>
      </div>
    </nav>
  );
}
