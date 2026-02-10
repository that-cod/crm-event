import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ItemDetailClient from "./ItemDetailClient";

export default async function InventoryItemDetail({
  params,
}: {
  params: { id: string };
}) {
  const item = await prisma.item.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      subcategory: true,
    },
  });

  if (!item) {
    notFound();
  }

  return <ItemDetailClient initialItem={item} />;
}
