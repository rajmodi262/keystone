"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="mono rounded border border-line px-4 py-2 text-[10px] tracking-[0.16em] text-muted transition-colors hover:border-danger hover:text-danger"
    >
      SIGN OUT
    </button>
  );
}
