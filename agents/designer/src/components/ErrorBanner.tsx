import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function ErrorBanner({ message }: { message: string }) {
  return (
    <Alert variant="destructive" className="mb-3">
      <AlertCircle className="h-5 w-5" />
      <AlertTitle>Erreur</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
