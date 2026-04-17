import React from "react";
export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-500">
      {children}
    </div>
  );
}
