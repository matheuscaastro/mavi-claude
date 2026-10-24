import { asc } from "drizzle-orm";
import { db } from "@db/index";
import { services } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { centsToInput, formatBRL } from "@/lib/money";
import { formatDuration } from "@/lib/time";
import ServicesManager, { type ServiceRow } from "./ServicesManager";

export const metadata = { title: "Serviços" };

export default async function ServicesPage() {
  const user = await requireUser("services.view");
  const rows = await db.select().from(services).orderBy(asc(services.category), asc(services.name));
  const data: ServiceRow[] = rows.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    durationMin: s.durationMin,
    durationLabel: formatDuration(s.durationMin),
    bufferMin: s.bufferMin,
    price: centsToInput(s.priceCents),
    priceLabel: formatBRL(s.priceCents),
    publicVisible: s.publicVisible,
    active: s.active,
  }));
  return <ServicesManager rows={data} canManage={can(user.accessRole, "services.manage")} />;
}
