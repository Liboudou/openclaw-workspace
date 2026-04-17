import { Loader2 } from "lucide-react";
import React from "react";

export const Loader = () => (
  <div className="flex items-center justify-center h-full w-full min-h-12 animate-spin">
    <Loader2 className="h-8 w-8 text-muted-foreground" />
    <span className="sr-only">Loading...</span>
  </div>
);
