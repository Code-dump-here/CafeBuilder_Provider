"use client";

import * as React from "react";
import {
  ChevronDown,
  Download,
  Filter,
  KeyRound,
  Pause,
  Search,
  Trash2,
  UserPlus,
  MoreHorizontal,
  Pencil,
  Power,
  Send,
} from "lucide-react";
import { useFormatter } from "next-intl";

import { PageHead } from "@/components/admin/page-head";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ADMIN_ACCOUNTS,
  type AccountRole,
  type AccountStatus,
  type AdminAccount,
} from "@/lib/admin/admin-mock-data";

const ROLE_OPTIONS: AccountRole[] = ["admin", "contractor", "customer"];
const STATUS_OPTIONS: AccountStatus[] = ["active", "invited", "suspended"];

const ROLE_TONE: Record<AccountRole, string> = {
  admin: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  contractor: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  customer: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
};

const STATUS_TONE: Record<AccountStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  invited: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  suspended: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

interface InviteState {
  open: boolean;
  email: string;
  role: AccountRole;
}

export default function AdminAccountsPage() {
  const format = useFormatter();
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<"all" | AccountRole>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | AccountStatus>("all");

  // Local mutation state — keeps the demo feel without persisting.
  const [accounts, setAccounts] = React.useState<AdminAccount[]>(ADMIN_ACCOUNTS);
  const [invite, setInvite] = React.useState<InviteState>({
    open: false,
    email: "",
    role: "customer",
  });

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (roleFilter !== "all" && acc.role !== roleFilter) return false;
      if (statusFilter !== "all" && acc.status !== statusFilter) return false;
      if (!q) return true;
      return (
        acc.name.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q)
      );
    });
  }, [accounts, search, roleFilter, statusFilter]);

  const toggleStatus = (id: string) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: a.status === "suspended" ? "active" : "suspended" } : a
      )
    );
  };

  const deleteAccount = (id: string) => {
    if (!window.confirm("Delete this account? This action cannot be undone.")) return;
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const email = invite.email.trim();
    if (!email) return;
    const name = email.split("@")[0] ?? "New user";
    const newAccount: AdminAccount = {
      id: `u_${Math.random().toString(36).slice(2, 8)}`,
      name: name.replace(/\W/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      email,
      role: invite.role,
      status: "invited",
      joinedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      projectCount: 0,
    };
    setAccounts((prev) => [newAccount, ...prev]);
    setInvite({ open: false, email: "", role: "customer" });
  };

  return (
    <>
      <PageHead
        title="Account management"
        description={`${accounts.length} accounts across all roles. Search, filter, or invite new members.`}
        actions={
          <>
            <Button size="sm" variant="outline">
              <Download aria-hidden />
              Export
            </Button>
            <Button size="sm" onClick={() => setInvite((prev) => ({ ...prev, open: true }))}>
              <UserPlus aria-hidden />
              Invite user
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/60 p-3 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="h-9 pl-8 text-sm"
          />
        </div>

        <FilterChip
          label="Role"
          value={roleFilter === "all" ? "All" : roleFilter}
          onClear={() => setRoleFilter("all")}
          options={ROLE_OPTIONS.map((r) => ({ id: r, label: r, onSelect: () => setRoleFilter(r) }))}
        />
        <FilterChip
          label="Status"
          value={statusFilter === "all" ? "All" : statusFilter}
          onClear={() => setStatusFilter("all")}
          options={STATUS_OPTIONS.map((s) => ({ id: s, label: s, onSelect: () => setStatusFilter(s) }))}
        />

        <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Filter className="size-3" aria-hidden /> {filtered.length}/{accounts.length} shown
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/60 bg-card/60 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Account</th>
                <th className="px-4 py-2.5 text-left font-medium">Role</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Projects</th>
                <th className="px-4 py-2.5 text-left font-medium">Last active</th>
                <th className="px-4 py-2.5 text-left font-medium">Joined</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((acc) => (
                <tr key={acc.id} className="group transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={acc.name} />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-foreground">{acc.name}</span>
                        <span className="truncate text-[11px] text-muted-foreground">{acc.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", ROLE_TONE[acc.role])}>
                      {acc.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_TONE[acc.status])}>
                      {acc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{acc.projectCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format.relativeTime(new Date(acc.lastActiveAt))}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format.dateTime(new Date(acc.joinedAt), { dateStyle: "medium" })}
                  </td>
                  <td className="px-4 py-3">
                    <RowActions
                      account={acc}
                      onSuspend={() => toggleStatus(acc.id)}
                      onDelete={() => deleteAccount(acc.id)}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No accounts match your filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {invite.open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onClick={() => setInvite((prev) => ({ ...prev, open: false }))}
        >
          <form
            onSubmit={handleInvite}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg border border-border bg-background p-5 shadow-xl"
          >
            <h2 className="text-base font-semibold">Invite a new user</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              We'll send an invite link to their email — they'll join as the
              role you choose.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <Field label="Email">
                <Input
                  type="email"
                  value={invite.email}
                  onChange={(e) => setInvite((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="name@aicoffee.io"
                  autoFocus
                  required
                />
              </Field>
              <Field label="Role">
                <select
                  value={invite.role}
                  onChange={(e) => setInvite((prev) => ({ ...prev, role: e.target.value as AccountRole }))}
                  className="border-input bg-transparent flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r} className="capitalize">
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setInvite((prev) => ({ ...prev, open: false }))}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                <Send aria-hidden />
                Send invite
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold uppercase text-primary">
      {initials}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function FilterChip({
  label,
  value,
  onClear,
  options,
}: {
  label: string;
  value: string;
  onClear: () => void;
  options: { id: string; label: string; onSelect: () => void }[];
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 text-xs",
          value !== "All" && value.toLowerCase() !== "all"
            ? "border-primary/60 text-primary"
            : "text-muted-foreground hover:border-foreground/30"
        )}
      >
        <span className="font-medium text-foreground">{label}:</span>
        <span className="capitalize">{value}</span>
        <ChevronDown className="size-3" aria-hidden />
      </button>
      <div className="invisible absolute left-0 top-full z-20 mt-1 min-w-[140px] rounded-md border border-border bg-popover p-1 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <button
          type="button"
          onClick={onClear}
          className="block w-full rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted"
        >
          All
        </button>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={opt.onSelect}
            className="block w-full rounded-sm px-2 py-1.5 text-left text-xs capitalize hover:bg-muted"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RowActions({
  account,
  onSuspend,
  onDelete,
}: {
  account: AdminAccount;
  onSuspend: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative flex items-center justify-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 text-[11px]"
        onClick={onSuspend}
        aria-label={account.status === "suspended" ? "Reactivate" : "Suspend"}
      >
        {account.status === "suspended" ? (
          <>
            <Power aria-hidden /> Reactivate
          </>
        ) : (
          <>
            <Pause aria-hidden /> Suspend
          </>
        )}
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        aria-label="More actions"
        aria-expanded={open}
      >
        <MoreHorizontal aria-hidden />
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1 min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-lg"
        >
          <MenuItem icon={Pencil} label="Edit profile" />
          <MenuItem icon={KeyRound} label="Reset password" />
          <MenuItem icon={Send} label="Resend invite" disabled={account.status !== "invited"} />
          <div className="my-1 h-px bg-border" />
          <MenuItem
            icon={Trash2}
            label="Delete account"
            tone="destructive"
            onSelect={() => {
              setOpen(false);
              onDelete();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  tone,
  disabled,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  tone?: "destructive";
  disabled?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
        tone === "destructive" && "text-rose-700 dark:text-rose-300"
      )}
    >
      <Icon className="size-3.5" aria-hidden /> {label}
    </button>
  );
}