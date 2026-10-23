import { requireUser } from "@/lib/auth";
import ServiceForm from "../ServiceForm";
import { createService } from "../actions";

export const metadata = { title: "Novo serviço" };

export default async function NewServicePage() {
  await requireUser("services.manage");
  return (
    <>
      <h1 className="page-title" style={{ marginBottom: 16 }}>
        Novo serviço
      </h1>
      <div className="card" style={{ maxWidth: 640 }}>
        <ServiceForm
          action={createService}
          submitLabel="Cadastrar"
          defaults={{ name: "", description: "", category: "Podologia", durationMin: "45", bufferMin: "0", price: "", publicVisible: true }}
        />
      </div>
    </>
  );
}
