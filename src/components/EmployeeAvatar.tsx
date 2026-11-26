import { initialsOf } from "@/lib/employee-photo-shared";

/** Foto da funcionária ou, sem foto, as iniciais sobre a cor dela. */
export default function EmployeeAvatar({ name, color, photo, size = 32 }: { name: string; color: string; photo: string | null; size?: number }) {
  const box = { width: size, height: size, borderRadius: "50%", flex: "0 0 auto" } as const;
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" width={size} height={size} style={{ ...box, objectFit: "cover", display: "block", boxShadow: `0 0 0 2px ${color}` }} />;
  }
  return (
    <span aria-hidden="true" style={{ ...box, background: color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: Math.round(size * 0.4) }}>
      {initialsOf(name)}
    </span>
  );
}
