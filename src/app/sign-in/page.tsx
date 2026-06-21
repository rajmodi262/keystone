"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  AuthShell,
  fieldCls,
  labelCls,
  primaryBtnCls,
} from "@/components/auth-shell";

export default function SignInPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AuthShell
      kicker="SIGN IN"
      title="Resume monitoring"
      subtitle="Pick up where the lighttable left off."
      footer={
        <>
          No account yet?{" "}
          <Link href="/sign-up" className="text-blueprint hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setLoading(true);
          const res = await signIn("credentials", {
            email: form.email,
            password: form.password,
            redirect: false,
          });
          setLoading(false);
          if (res?.error) {
            setError("Invalid email or password.");
            return;
          }
          router.push("/app");
          router.refresh();
        }}
      >
        <div>
          <label className={labelCls}>WORK EMAIL</label>
          <input
            className={fieldCls}
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="priya@acme.com"
            required
          />
        </div>
        <div>
          <label className={labelCls}>PASSWORD</label>
          <input
            className={fieldCls}
            type="password"
            value={form.password}
            onChange={set("password")}
            required
          />
        </div>

        {error && (
          <p className="mono rounded border border-danger/40 bg-danger/10 px-3 py-2 text-[11px] text-danger">
            {error}
          </p>
        )}

        <button type="submit" className={primaryBtnCls} disabled={loading}>
          {loading ? "VERIFYING…" : "SIGN IN"}
        </button>
      </form>
    </AuthShell>
  );
}
