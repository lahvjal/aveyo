interface AveyoWordmarkProps {
  collapsed?: boolean;
  className: string;
  logoClassName: string;
  miniClassName: string;
  miniLogoClassName: string;
  logoSrc?: string;
  miniLogoSrc?: string;
  logoAlt?: string;
}

export function AveyoWordmark({
  collapsed = false,
  className,
  logoClassName,
  miniClassName,
  miniLogoClassName,
  logoSrc = "/images/aveyo-logo.svg",
  miniLogoSrc = "/images/aveyo-icon.svg",
  logoAlt = "Aveyo"
}: AveyoWordmarkProps) {
  return (
    <div className={`${className}${collapsed ? " collapsed" : ""}`} aria-label="Aveyo">
      <img src={logoSrc} alt={logoAlt} className={logoClassName} />
      <span className={miniClassName} aria-hidden="true">
        <img src={miniLogoSrc} alt="" className={miniLogoClassName} />
      </span>
    </div>
  );
}
