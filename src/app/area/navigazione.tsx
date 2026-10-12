"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const voci = [
  { href: "/area", etichetta: "Home" },
  { href: "/area/prodotti", etichetta: "Prodotti" },
  { href: "/area/ordini", etichetta: "Ordini" },
  { href: "/area/carriera", etichetta: "Carriera" },
  { href: "/area/provvigioni", etichetta: "Provvigioni" },
];

export function NavigazioneArea() {
  const percorso = usePathname();
  return (
    <nav
      aria-label="Sezioni"
      className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-bordo bg-superficie pb-[env(safe-area-inset-bottom)]"
    >
      {voci.map((v) => {
        const attiva = v.href === "/area" ? percorso === "/area" : percorso.startsWith(v.href);
        return (
          <Link
            key={v.href}
            href={v.href}
            aria-current={attiva ? "page" : undefined}
            className={`py-4 text-center text-[11px] font-medium tracking-wide ${attiva ? "text-oro-chiaro" : "text-testo-tenue"}`}
          >
            {v.etichetta}
          </Link>
        );
      })}
    </nav>
  );
}
