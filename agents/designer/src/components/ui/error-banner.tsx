import React from "react";

interface ErrorBannerProps {
  message: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message }) => (
  <div className="my-4 rounded-lg bg-destructive/10 px-4 py-2 text-destructive border border-destructive">
    <span className="font-medium">Erreur :</span> {message}
  </div>
);
