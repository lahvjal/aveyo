import styles from "./brand-loader.module.css";

interface BrandLoaderProps {
  size?: number;
  tone?: "dark" | "light";
  label?: string;
  className?: string;
}

const LOGO_LOADER_PATH =
  "M104.636 1C114.743 1.00006 123.558 8.24778 126.03 18.5075L151.659 123.971H122.674C112.532 123.971 103.717 116.722 101.245 106.39L92.4376 69.7161L70.4023 111.916C66.5424 119.352 59.1347 123.971 51.0469 123.971H1.65869L25.6926 78.4566C29.5876 71.097 36.9579 66.5137 45.0105 66.5137H91.6688L76.7182 4.26154L54.6795 46.4386C50.8195 53.8737 43.412 58.4929 35.3241 58.4929H2.04558L26.0778 12.9437L26.0786 12.9429C29.974 5.58261 37.3798 1 45.3966 1H104.636Z";
const VIEWBOX_WIDTH = 161.66;
const VIEWBOX_HEIGHT = 133.97;

const screenReaderOnlyStyle = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0
} as const;

export function BrandLoader({
  size = 153,
  tone = "dark",
  label = "Loading",
  className = ""
}: BrandLoaderProps) {
  const height = (size / VIEWBOX_WIDTH) * VIEWBOX_HEIGHT;

  return (
    <div
      className={[styles.root, tone === "light" ? styles.light : "", className]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
    >
      <svg
        aria-hidden="true"
        width={size}
        height={height}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.svg}
      >
        <path className={styles.outline} d={LOGO_LOADER_PATH} />
        <path className={styles.segment} d={LOGO_LOADER_PATH} />
      </svg>

      <span style={screenReaderOnlyStyle}>{label}</span>
    </div>
  );
}
