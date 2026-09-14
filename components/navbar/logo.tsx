import Link from "next/link";

export const Logo = () => (
  <Link
    href="/"
    className="text-lg font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity"
  >
    SmartCoffeeBuilder
  </Link>
);