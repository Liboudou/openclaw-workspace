import "@/styles/globals.css";
import type { Metadata } from "next";
import { GeistSans } from "next/font/google";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "TestProjet | Items CRUD",
  description: "TestProjet Frontend feat. shadcn/ui, Next.js, TS, Tailwind",
};

const geist = GeistSans();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={geist.className + " bg-background min-h-screen text-foreground"}>
        <Navbar />
        <main className="mx-auto w-full max-w-4xl p-4">{children}</main>
      </body>
    </html>
  );
}