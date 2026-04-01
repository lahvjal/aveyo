import type { ReactNode } from "react";

export type RuntimeEnvironment = "local" | "dev" | "staging" | "prod";

export interface PlatformSideNavClassNames {
  aside: string;
  header: string;
  brandRow: string;
  collapseToggle: string;
  primaryNav: string;
  navItem: string;
  navIcon: string;
  navLabel: string;
  utilityNav: string;
  utilityItem: string;
  profileRow: string;
  profileAvatar: string;
  profileCopy: string;
}

export interface PlatformSideNavLinkRendererProps {
  key: string;
  href: string;
  className: string;
  title?: string;
  ariaLabel: string;
  children: ReactNode;
}

export type PlatformSideNavLinkRenderer = (
  props: PlatformSideNavLinkRendererProps
) => ReactNode;

export interface PlatformNavIconRenderProps {
  icon: string;
  src: string;
}

export type PlatformNavIconRenderer = (props: PlatformNavIconRenderProps) => ReactNode;

export interface PlatformUtilityNavItem {
  id: string;
  label: string;
  icon: string;
  href?: string;
  matchPrefixes?: string[];
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export interface PlatformProfileRowProps {
  displayName: string;
  roleLabel: string;
  avatarUrl?: string | null;
  initials?: string;
  disabled?: boolean;
  onClick: () => void;
}
