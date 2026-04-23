import { BrandLoader } from "./brand-loader";
import styles from "./site-loading-screen.module.css";

interface SiteLoadingScreenProps {
  className?: string;
  phase?: "visible" | "fading";
}

export function SiteLoadingScreen({
  className = "",
  phase = "visible"
}: SiteLoadingScreenProps) {
  return (
    <main
      className={[styles.root, phase === "fading" ? styles.fading : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        aria-hidden="true"
        className={styles.wash}
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,249,247,0.96) 38%, rgba(236,244,255,0.96) 74%, rgba(226,239,255,0.98) 100%)"
        }}
      />
      <div
        aria-hidden="true"
        className={styles.glow}
        style={{
          background:
            "radial-gradient(circle at 50% 74%, rgba(178,214,255,0.34) 0%, rgba(198,225,255,0.2) 20%, rgba(219,236,255,0.08) 40%, rgba(255,255,255,0) 66%)"
        }}
      />
      <div
        aria-hidden="true"
        className={styles.accent}
        style={{
          background:
            "radial-gradient(circle at 22% 92%, rgba(173,213,255,0.24) 0%, rgba(173,213,255,0.1) 24%, rgba(255,255,255,0) 54%), radial-gradient(circle at 78% 96%, rgba(207,228,255,0.18) 0%, rgba(207,228,255,0.08) 22%, rgba(255,255,255,0) 50%)"
        }}
      />

      <div className={styles.content}>
        <BrandLoader
          size={68}
          tone="dark"
          label="Loading Aveyo"
          className={styles.loader}
        />
      </div>
    </main>
  );
}
