import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ItemCardProps {
  item: { id: string; name: string; description: string; tag?: string };
}

export const ItemCard = ({ item }: ItemCardProps) =>
  <Card className="w-full max-w-sm h-full flex flex-col justify-between">
    <CardHeader>
      <h3 className="font-semibold text-lg">{item.name}</h3>
      <span className="text-sm text-muted-foreground">ID: {item.id}</span>
      {item.tag && <Badge>{item.tag}</Badge>}
    </CardHeader>
    <CardContent>
      <div className="text-sm">{item.description}</div>
    </CardContent>
  </Card>;
