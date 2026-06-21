"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";

const ROLES = ["OWNER", "ARCHITECT", "ENGINEER", "CONTRACTOR", "CLIENT"] as const;
const field =
  "mono rounded border border-line bg-ink/60 px-3 py-2 text-[12px] text-chalk outline-none placeholder:text-muted-2 focus:border-blueprint";

export function MembersPanel({
  orgId,
  isOwner,
  currentUserId,
}: {
  orgId: string;
  isOwner: boolean;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const members = api.members.list.useQuery({ orgId }, { enabled: open });
  const invalidate = () => utils.members.list.invalidate({ orgId });

  const invite = api.members.invite.useMutation({ onSuccess: invalidate });
  const setRole = api.members.setRole.useMutation({ onSuccess: invalidate });
  const remove = api.members.remove.useMutation({ onSuccess: invalidate });

  const [email, setEmail] = useState("");
  const [role, setRoleSel] = useState("CONTRACTOR");
  const err = invite.error || setRole.error || remove.error;

  return (
    <div className="mt-3 border-t border-line pt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="mono flex w-full items-center justify-between text-[10px] tracking-[0.24em] text-muted-2"
      >
        <span>TEAM &amp; ROLES</span>
        <span className="text-blueprint">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {members.data?.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 rounded border border-line bg-ink/40 px-3 py-2"
            >
              <span className="min-w-0 truncate text-[12px] text-chalk">
                {m.user.name ?? m.user.email}
                <span className="mono ml-2 text-[10px] text-muted-2">
                  {m.user.email}
                </span>
              </span>
              {isOwner && m.user.id !== currentUserId ? (
                <span className="flex items-center gap-1">
                  <select
                    value={m.role}
                    onChange={(e) =>
                      setRole.mutate({
                        orgId,
                        userId: m.user.id,
                        role: e.target.value as (typeof ROLES)[number],
                      })
                    }
                    className={`${field} py-1`}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r} className="bg-graphite">
                        {r}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => remove.mutate({ orgId, userId: m.user.id })}
                    className="mono rounded border border-line px-2 py-1 text-[9px] text-muted-2 transition-colors hover:border-danger hover:text-danger"
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <span
                  className="mono text-[9px] tracking-[0.16em] text-blueprint"
                >
                  {m.role}
                </span>
              )}
            </div>
          ))}

          {isOwner && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                invite.mutate({ orgId, email, role: role as (typeof ROLES)[number] });
                setEmail("");
              }}
              className="flex flex-wrap items-center gap-2 pt-1"
            >
              <input
                className={`${field} flex-1`}
                type="email"
                placeholder="teammate@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <select
                className={`${field} py-2`}
                value={role}
                onChange={(e) => setRoleSel(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="bg-graphite">
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={invite.isPending}
                className="mono rounded bg-blueprint px-3 py-2 text-[10px] font-semibold tracking-[0.12em] text-[#06212e] transition-colors hover:bg-[#5ccfff] disabled:opacity-50"
              >
                INVITE
              </button>
            </form>
          )}

          {err && <p className="mono text-[11px] text-danger">{err.message}</p>}
        </div>
      )}
    </div>
  );
}
