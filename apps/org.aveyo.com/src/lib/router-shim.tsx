"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useEffect } from "react";
import NextLink from "next/link";
import { useParams as useNextParams, usePathname, useRouter, useSearchParams } from "next/navigation";

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: string;
  replace?: boolean;
  children: ReactNode;
}

export function Link({ to, replace, children, ...props }: LinkProps) {
  return (
    <NextLink href={to} replace={replace} {...props}>
      {children}
    </NextLink>
  );
}

export function useNavigate() {
  const router = useRouter();

  return (to: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      router.replace(to);
      return;
    }
    router.push(to);
  };
}

export function useLocation() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const search = searchParams?.toString();

  return {
    pathname,
    search: search ? `?${search}` : "",
    hash: ""
  };
}

export function useParams<T extends Record<string, string>>() {
  return useNextParams() as T;
}

export function Navigate({ to, replace = false }: { to: string; replace?: boolean }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, replace, to]);
  return null;
}

export function BrowserRouter({ children }: { children: ReactNode; [key: string]: unknown }) {
  return <>{children}</>;
}

export function MemoryRouter({ children }: { children: ReactNode; [key: string]: unknown }) {
  return <>{children}</>;
}

export function Routes({ children }: { children: ReactNode; [key: string]: unknown }) {
  return <>{children}</>;
}

export function Route({
  element,
  children
}: {
  element?: ReactNode;
  children?: ReactNode;
  [key: string]: unknown;
}) {
  return <>{element ?? children ?? null}</>;
}
