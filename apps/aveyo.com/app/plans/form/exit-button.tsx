import Link from "next/link";

export default function PlansFormExitButton({
  href = "/"
}: {
  href?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="Exit plans form"
      className="inline-flex items-center justify-center gap-2 rounded-[var(--site-button-radius)] border border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-white px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-button-text)] font-bold text-[#212120] text-[color:var(--site-black)] transition-colors hover:bg-[#f5f7f9]"
    >
      <span aria-hidden="true" className="text-lg leading-none">
        ×
      </span>
      <span>Exit</span>
    </Link>
  );
}
