import { asc, count, eq } from "drizzle-orm";
import { db } from "@db/index";
import { serviceCategories, services } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { centsToInput, formatBRL } from "@/lib/money";
import { formatDuration } from "@/lib/time";
import ServicesManager, { type ServiceRow } from "./ServicesManager";

export const metadata = { title: "Serviços" };

export default async function ServicesPage() {
  const user = await requireUser("services.view");
  const [rows, cats] = await Promise.all([
    db
      .select({ s: services, categoryName: serviceCategories.name })
      .from(services)
      .innerJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
      .orderBy(asc(serviceCategories.name), asc(services.name)),
    db
      .select({ id: serviceCategories.id, name: serviceCategories.name, total: count(services.id) })
      .from(serviceCategories)
      .leftJoin(services, eq(services.categoryId, serviceCategories.id))
      .groupBy(serviceCategories.id)
      .orderBy(asc(serviceCategories.name)),
  ]);
  const data: ServiceRow[] = rows.map(({ s, categoryName }) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    categoryId: s.categoryId,
    categoryName,
    durationMin: s.durationMin,
    durationLabel: formatDuration(s.durationMin),
    bufferMin: s.bufferMin,
    price: centsToInput(s.priceCents),
    priceLabel: formatBRL(s.priceCents),
    publicVisible: s.publicVisible,
    active: s.active,
  }));
  return (
    <ServicesManager
      rows={data}
      categories={cats.map((c) => ({ id: c.id, name: c.name, total: c.total }))}
      canManage={can(user.accessRole, "services.manage")}
      canManageCategories={can(user.accessRole, "categories.manage")}
    />
  );
}
