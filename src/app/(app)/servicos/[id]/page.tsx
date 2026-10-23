import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@db/index";
import { services } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { centsToInput } from "@/lib/money";
import ServiceForm from "../ServiceForm";
import { setServiceActive, updateService } from "../actions";

export const metadata = { title: "Serviço" };

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("services.manage");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [s] = await db.select().from(services).where(eq(services.id, id));
  if (!s) notFound();
  return (
    <>
      <h1 className="page-title" style={{ marginBottom: 16 }}>
        {s.name}
      </h1>
      <div className="card" style={{ maxWidth: 640 }}>
        <ServiceForm
          action={updateService.bind(null, s.id)}
          submitLabel="Salvar alterações"
          defaults={{
            name: s.name,
            description: s.description,
            category: s.category,
            durationMin: String(s.durationMin),
            bufferMin: String(s.bufferMin),
            price: centsToInput(s.priceCents),
            publicVisible: s.publicVisible,
          }}
        />
        <p className="muted small">Mudanças de preço e duração valem só para novos agendamentos; o histórico não muda.</p>
        <form action={setServiceActive.bind(null, s.id, !s.active)}>
          <button className="btn secondary" type="submit">
            {s.active ? "Inativar serviço" : "Reativar serviço"}
          </button>
        </form>
      </div>
    </>
  );
}
