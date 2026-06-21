"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { api } from "@/lib/trpc/client";
import {
  AuthShell,
  fieldCls,
  labelCls,
  primaryBtnCls,
} from "@/components/auth-shell";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    org: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);

  const register = api.auth.register.useMutation({
    onError: (e) => setError(e.message),
    onSuccess: async () => {
      const res = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (res?.error) {
        setError("Account created, but sign-in failed. Try signing in.");
        return;
      }
      router.push("/app");
      router.refresh();
    },
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AuthShell
      kicker="CREATE ACCOUNT"
      title="Enter the lighttable"
      subtitle="Spin up your firm's workspace. You'll be the owner."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/sign-in" className="text-blueprint hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          register.mutate(form);
        }}
      >
        <div>
          <label className={labelCls}>YOUR NAME</label>
          <input
            className={fieldCls}
            value={form.name}
            onChange={set("name")}
            placeholder="Priya Nair"
            required
          />
        </div>
        <div>
          <label className={labelCls}>FIRM / ORGANIZATION</label>
          <input
            className={fieldCls}
            value={form.org}
            onChange={set("org")}
            placeholder="Acme Designs"
            required
          />
        </div>
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
            placeholder="8+ characters"
            minLength={8}
            required
          />
        </div>

        {error && (
          <p className="mono rounded border border-danger/40 bg-danger/10 px-3 py-2 text-[11px] text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          className={primaryBtnCls}
          disabled={register.isPending}
        >
          {register.isPending ? "CREATING…" : "CREATE WORKSPACE"}
        </button>
      </form>
    </AuthShell>
  );
}
