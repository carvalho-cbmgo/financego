"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

function isActiveNav(href: string, pathname: string, searchParams: Pick<URLSearchParams, "get">) {
  const target = new URL(href, "https://finance-go.local");
  const targetPath = target.pathname;
  const targetTab = target.searchParams.get("tab");

  if (targetPath === "/dashboard" && targetTab === "transactions") {
    return pathname === "/dashboard" && searchParams.get("tab") === "transactions";
  }

  if (targetPath === "/dashboard" && !targetTab) {
    return pathname === "/dashboard" && searchParams.get("tab") !== "transactions";
  }

  return pathname === targetPath;
}

export function TopNavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <>
      {items.map((item) => {
        const isActive = isActiveNav(item.href, pathname, searchParams);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shell-topnav-link ${isActive ? "is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
