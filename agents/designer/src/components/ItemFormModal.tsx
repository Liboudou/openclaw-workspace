import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const itemSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  description: z.string().min(1, "Description requise"),
  tag: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemFormModalProps {
  onSubmit: (data: ItemFormValues) => void;
  triggerLabel?: string;
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({ onSubmit, triggerLabel = "Ajouter un item" }) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: "", description: "", tag: "" }
  });

  const handleForm = (data: ItemFormValues) => {
    onSubmit(data);
    reset();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleForm)} className="flex flex-col gap-4 pt-2">
          <div>
            <Label htmlFor="name">Nom</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <div className="text-destructive text-xs mt-1">{errors.name.message}</div>}
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register("description")} />
            {errors.description && <div className="text-destructive text-xs mt-1">{errors.description.message}</div>}
          </div>
          <div>
            <Label htmlFor="tag">Tag</Label>
            <Input id="tag" {...register("tag")} />
          </div>
          <Button type="submit">Créer l'item</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
