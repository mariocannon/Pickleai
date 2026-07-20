"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload clip" },
  { href: "/reports", label: "My reports" },
  { href: "/account", label: "Account" },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="side-nav" aria-label="App">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={
            pathname === item.href || pathname.startsWith(item.href + "/")
              ? "page"
              : undefined
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
