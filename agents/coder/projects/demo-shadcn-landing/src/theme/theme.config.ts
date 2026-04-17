import * as React from 'react';
import { ThemeProvider as ShadcnThemeProvider } from 'shadcn-ui/react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ShadcnThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={["light", "dark"]}
      accentColor="accent"
    >
      {children}
    </ShadcnThemeProvider>
  );
}
