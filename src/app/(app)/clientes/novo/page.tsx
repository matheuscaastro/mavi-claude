import { requireUser } from "@/lib/auth";
import ClientForm from "../ClientForm";
import { createClient } from "../actions";

export const metadata = { title: "Nova cliente" };

export default async function NewClientPage() {
  await requireUser("clients.edit");
  return (
    <>
      <h1 className="page-title" style={{ marginBottom: 16 }}>
        Nova cliente
      </h1>
      <div className="card" style={{ maxWidth: 640 }}>
        <ClientForm
          action={createClient}
          submitLabel="Cadastrar"
          defaults={{ name: "", phone: "", email: "", birthDate: "", cpf: "", notes: "", whatsappOptIn: false }}
        />
      </div>
    </>
  );
}
