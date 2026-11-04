"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
  /** Termos extras para a busca (ex.: telefone sem formatação). */ keywords?: string;
};

type Props = {
  name?: string;
  options: SelectOption[];
  /** Valor inicial (modo não controlado). */
  defaultValue?: string;
  /** Valor atual (modo controlado). */
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  searchPlaceholder?: string;
  "aria-label"?: string;
};

const norm = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Lista suspensa com busca. Substitui o <select> nativo: abre um painel com campo de busca,
 * navegação por teclado (setas, Enter, Esc, Home/End) e envia o valor no formulário pelo `name`.
 * O painel usa posição fixa, então não é cortado por modais com rolagem.
 */
export default function Select({
  name,
  options,
  defaultValue = "",
  value,
  onChange,
  placeholder = "Escolher…",
  required,
  disabled,
  searchPlaceholder = "Buscar…",
  ...rest
}: Props) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue);
  const current = controlled ? value : inner;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
    up: boolean;
    max: number;
  } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const shown = useMemo(() => {
    const q = norm(query);
    if (!q) return options;
    const digits = query.replace(/\D/g, "");
    return options.filter((o) => {
      const text = norm(`${o.label} ${o.hint ?? ""} ${o.keywords ?? ""}`);
      if (text.includes(q)) return true;
      // Telefone: acha mesmo digitando sem parênteses, espaço ou traço.
      return (
        digits.length >= 2 &&
        `${o.hint ?? ""} ${o.keywords ?? ""}`
          .replace(/\D/g, "")
          .includes(digits)
      );
    });
  }, [options, query]);
  const selected = options.find((o) => o.value === current);

  const place = useCallback(() => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 16;
    const above = r.top - 16;
    const up = below < 280 && above > below;
    const max = Math.max(180, Math.min(360, up ? above : below));
    setPos({
      top: up ? r.top - 8 : r.bottom + 8,
      left: Math.min(
        r.left,
        Math.max(8, window.innerWidth - Math.max(r.width, 220) - 8),
      ),
      width: Math.max(r.width, 220),
      up,
      max,
    });
  }, []);

  const close = useCallback((focusTrigger = true) => {
    setOpen(false);
    setPos(null);
    setQuery("");
    if (focusTrigger) trigger.current?.focus();
  }, []);

  const pick = useCallback(
    (v: string) => {
      if (!controlled) setInner(v);
      onChange?.(v);
      close();
    },
    [controlled, onChange, close],
  );

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const idx = Math.max(
      0,
      options.findIndex((o) => o.value === current),
    );
    setActive(idx);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!root.current?.contains(t) && !popRef.current?.contains(t))
        close(false);
    };
    // Se a página rolar ou a janela mudar de tamanho, o painel acompanha o campo.
    const onMove = (e: Event) => {
      if (list.current?.contains(e.target as Node)) return;
      place();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // O painel só existe depois de calcular a posição; é aí que o campo de busca recebe o foco.
  const placed = pos !== null;
  useEffect(() => {
    if (open && placed) search.current?.focus({ preventScroll: true });
  }, [open, placed]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open) return;
    const box = list.current;
    const el = box?.querySelector<HTMLElement>(`[data-i="${active}"]`);
    if (!box || !el) return;
    if (el.offsetTop < box.scrollTop) box.scrollTop = el.offsetTop - 2;
    else if (el.offsetTop + el.offsetHeight > box.scrollTop + box.clientHeight)
      box.scrollTop = el.offsetTop + el.offsetHeight - box.clientHeight + 2;
  }, [active, open]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(shown.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(Math.max(0, shown.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[active]) pick(shown[active].value);
    } else if (e.key === "Tab") {
      close(false);
    }
  }

  return (
    <div
      className={`select${open ? " open" : ""}${disabled ? " disabled" : ""}`}
      ref={root}
    >
      {/* Campo de verdade do formulário: envia o valor e mostra o aviso de "obrigatório" do navegador. */}
      <input
        className="select-proxy"
        name={name}
        value={current}
        onChange={() => {}}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        onFocus={() => trigger.current?.focus()}
      />
      <button
        ref={trigger}
        type="button"
        className="select-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={rest["aria-label"]}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span
          className={selected ? "select-value" : "select-value placeholder"}
        >
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className="select-chevron"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={popRef}
              className={`select-pop${pos.up ? " up" : ""}`}
              style={{
                top: pos.up ? undefined : pos.top,
                bottom: pos.up ? window.innerHeight - pos.top : undefined,
                left: pos.left,
                width: pos.width,
              }}
              onKeyDown={onKey}
            >
              <div className="select-search">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  ref={search}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label="Buscar"
                  autoComplete="off"
                  aria-controls={`${id}-list`}
                  aria-activedescendant={
                    shown[active] ? `${id}-o${active}` : undefined
                  }
                />
              </div>
              <div
                className="select-list"
                role="listbox"
                id={`${id}-list`}
                ref={list}
                style={{ maxHeight: pos.max - 70 }}
              >
                {shown.map((o, i) => (
                  <div
                    key={o.value}
                    id={`${id}-o${i}`}
                    data-i={i}
                    role="option"
                    aria-selected={o.value === current}
                    className={`select-opt${i === active ? " active" : ""}${o.value === current ? " selected" : ""}`}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(o.value)}
                  >
                    <span className="select-opt-text">
                      {o.label}
                      {o.hint ? (
                        <span className="select-opt-hint">{o.hint}</span>
                      ) : null}
                    </span>
                    {o.value === current ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                    ) : null}
                  </div>
                ))}
                {shown.length === 0 ? (
                  <div className="select-empty">Nenhum resultado</div>
                ) : null}
              </div>
            </div>,
            // Dentro de um modal, o painel vai para o próprio <dialog> (camada de cima); fora, para o <body>.
            trigger.current?.closest("dialog") ?? document.body,
          )
        : null}
    </div>
  );
}
