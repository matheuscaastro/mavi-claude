"use client";

import { useCallback, useState } from "react";
import Modal from "@/components/Modal";
import CashCategoriesManager from "./CashCategoriesManager";
import EntryForm, { type CashCategory } from "./EntryForm";

export default function EntryPanel({ today, categories }: { today: string; categories: CashCategory[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <EntryForm today={today} categories={categories} onManageCategories={() => setOpen(true)} />
      <Modal open={open} onClose={close} title="Categorias do caixa">
        <CashCategoriesManager categories={categories} />
      </Modal>
    </>
  );
}
