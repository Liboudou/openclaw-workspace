import React from "react";
export default function Footer() {
  return (
    <footer className="w-full py-6 text-center text-xs text-muted-foreground bg-background/70 border-t mt-auto">
      © {new Date().getFullYear()} ShadDemo. Tous droits réservés.
    </footer>
  );
}
