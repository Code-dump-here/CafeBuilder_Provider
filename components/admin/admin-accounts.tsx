"use client";

import * as React from "react";
import {
  Search,
  MoreHorizontal,
  Ban,
  CheckCircle,
  Trash2,
  Eye,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  User,
  Shield,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "react-toastify";

import { useAccounts, useUpdateAccountStatus, useDeleteAccount } from "@/features/admin/hooks";
import type { Account, AccountRole, AccountStatus } from "@/features/admin/types";
import {
  LoadingSpinner,
  EmptyState,
  Pagination,
  StatusBadge,
  RoleBadge,
} from "./admin-components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function formatAccountDate(value: string | null | undefined, locale: string): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

// ─── Account Row ────────────────────────────────────────────────────────────────

function AccountRow({
  account,
  onView,
  onStatusChange,
  onDelete,
}: {
  account: Account;
  onView: (account: Account) => void;
  onStatusChange: (account: Account, status: AccountStatus) => void;
  onDelete: (account: Account) => void;
}) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const initials = account.email.slice(0, 2).toUpperCase();

  const emailVerifiedAt = formatAccountDate(account.emailVerifiedAt, locale);
  const isEmailVerified = emailVerifiedAt !== null;

  const roleSpecific = account.role === "owner" 
    ? account.shopOwner 
    : account.serviceProvider;

  const displayName = roleSpecific?.displayName 
    || account.shopOwner?.businessName 
    || account.email.split("@")[0];

  return (
    <tr className="group hover:bg-muted/30">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate max-w-50">
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground truncate max-w-50">
              {account.email}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <RoleBadge role={account.role} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={account.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex min-w-36 items-start gap-1.5">
          {isEmailVerified ? (
            <CheckCircle className="mt-0.5 size-4 shrink-0 text-emerald-500" />
          ) : (
            <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
          )}
          <div className="min-w-0">
            <p
              className={cn(
                "text-xs",
                isEmailVerified ? "text-emerald-600" : "text-muted-foreground",
              )}
            >
              {isEmailVerified ? t("accounts.verified") : t("accounts.pending")}
            </p>
            {emailVerifiedAt && (
              <p className="mt-0.5 text-[11px] text-muted-foreground" title={emailVerifiedAt}>
                {t("accounts.verifiedOn", { date: emailVerifiedAt })}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {new Date(account.createdAt).toLocaleDateString(
          locale === "vi" ? "vi-VN" : "en-US",
        )}
      </td>
      <td className="w-24 px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("accounts.actions")}
              className="size-8"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(account)}>
              <Eye className="mr-2 size-4" />
              {t("accounts.viewDetails")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {account.status === "pending" && (
              <DropdownMenuItem
                onClick={() => onStatusChange(account, "active")}
                className="text-emerald-600 focus:text-emerald-600"
              >
                <CheckCircle className="mr-2 size-4" />
                {t("accounts.approve")}
              </DropdownMenuItem>
            )}
            {account.status === "active" && (
              <DropdownMenuItem
                onClick={() => onStatusChange(account, "inactive")}
                className="text-amber-600 focus:text-amber-600"
              >
                <Ban className="mr-2 size-4" />
                {t("accounts.deactivate")}
              </DropdownMenuItem>
            )}
            {account.status === "inactive" && (
              <DropdownMenuItem
                onClick={() => onStatusChange(account, "active")}
                className="text-emerald-600 focus:text-emerald-600"
              >
                <CheckCircle className="mr-2 size-4" />
                {t("accounts.activate")}
              </DropdownMenuItem>
            )}
            {account.status === "banned" && (
              <DropdownMenuItem
                onClick={() => onStatusChange(account, "active")}
                className="text-emerald-600 focus:text-emerald-600"
              >
                <CheckCircle className="mr-2 size-4" />
                {t("accounts.unban")}
              </DropdownMenuItem>
            )}
            {account.status !== "banned" && (
              <DropdownMenuItem
                onClick={() => onStatusChange(account, "banned")}
                className="text-red-600 focus:text-red-600"
              >
                <Ban className="mr-2 size-4" />
                {t("accounts.ban")}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(account)}
              className="text-red-600 focus:text-red-600"
              variant="destructive"
            >
              <Trash2 className="mr-2 size-4" />
              {t("accounts.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

// ─── Account Detail Modal ────────────────────────────────────────────────────────

function AccountDetailModal({
  account,
  open,
  onClose,
  onStatusChange,
  onDelete,
}: {
  account: Account | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (account: Account, status: AccountStatus) => void;
  onDelete: (account: Account) => void;
}) {
  const t = useTranslations("Admin");
  const locale = useLocale();

  if (!account) return null;

  const roleSpecific = account.role === "owner"
    ? account.shopOwner
    : account.serviceProvider;

  const displayName = roleSpecific?.displayName
    || account.shopOwner?.businessName
    || account.email.split("@")[0];

  const dateFormatter = new Intl.DateTimeFormat(
    locale === "vi" ? "vi-VN" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Ho_Chi_Minh",
    },
  );

  const emailVerifiedAt = formatAccountDate(account.emailVerifiedAt, locale);
  const isEmailVerified = emailVerifiedAt !== null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("accounts.details")}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-heading text-lg font-semibold text-foreground">
                {displayName}
              </h3>
              <div className="mt-1 flex items-center gap-2">
                <RoleBadge role={account.role} />
                <StatusBadge status={account.status} />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="size-4 text-muted-foreground" />
              <span className="text-foreground">{account.email}</span>
              {isEmailVerified && (
                <CheckCircle className="size-4 text-emerald-500" />
              )}
            </div>
            {account.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="size-4 text-muted-foreground" />
                <span className="text-foreground">{account.phone}</span>
              </div>
            )}
            <div className="flex items-start gap-3 text-xs">
              <CheckCircle
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  isEmailVerified ? "text-emerald-500" : "text-muted-foreground/40",
                )}
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    "font-medium",
                    isEmailVerified ? "text-emerald-600" : "text-muted-foreground",
                  )}
                >
                  {isEmailVerified
                    ? t("accounts.verified")
                    : t("accounts.emailNotVerified")}
                </p>
                {emailVerifiedAt && (
                  <p className="mt-0.5 text-muted-foreground">
                    {t("accounts.verifiedOn", { date: emailVerifiedAt })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Role-specific Info */}
          {account.role === "owner" && account.shopOwner && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="size-4 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("accounts.shopOwner")}
                </span>
              </div>
              <p className="font-medium text-foreground">
                {account.shopOwner.businessName || displayName}
              </p>
            </div>
          )}

          {account.role === "provider" && account.serviceProvider && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("accounts.provider")}
                </span>
                {account.serviceProvider.isVerified && (
                  <CheckCircle className="size-4 text-emerald-500" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t("accounts.providerType")}</p>
                  <p className="font-medium capitalize">{account.serviceProvider.providerType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("accounts.capability")}</p>
                  <p className="font-medium capitalize">{account.serviceProvider.capability}</p>
                </div>
                {account.serviceProvider.avgRating !== null && (
                  <div>
                    <p className="text-muted-foreground">{t("accounts.rating")}</p>
                    <p className="font-medium">★ {account.serviceProvider.avgRating.toFixed(1)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t("accounts.createdAt")}</p>
              <p className="font-medium">{dateFormatter.format(new Date(account.createdAt))}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("accounts.updatedAt")}</p>
              <p className="font-medium">{dateFormatter.format(new Date(account.updatedAt))}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            {account.status === "pending" && (
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                onClick={() => {
                  onStatusChange(account, "active");
                  onClose();
                }}
              >
                <CheckCircle className="mr-2 size-4" />
                {t("accounts.approve")}
              </Button>
            )}
            {account.status === "active" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onStatusChange(account, "inactive");
                  onClose();
                }}
              >
                <Ban className="mr-2 size-4" />
                {t("accounts.deactivate")}
              </Button>
            )}
            {account.status === "inactive" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onStatusChange(account, "active");
                  onClose();
                }}
              >
                <CheckCircle className="mr-2 size-4" />
                {t("accounts.activate")}
              </Button>
            )}
            {account.status === "banned" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onStatusChange(account, "active");
                  onClose();
                }}
              >
                <CheckCircle className="mr-2 size-4" />
                {t("accounts.unban")}
              </Button>
            )}
            {account.status !== "banned" && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => {
                  onStatusChange(account, "banned");
                  onClose();
                }}
              >
                <Ban className="mr-2 size-4" />
                {t("accounts.ban")}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => {
                onClose();
                onDelete(account);
              }}
            >
              <Trash2 className="mr-2 size-4" />
              {t("accounts.delete")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Accounts Page ─────────────────────────────────────────────────────────

export function AdminAccounts() {
  const t = useTranslations("Admin");
  const tErrors = useTranslations("Auth.errors");

  const [params, setParams] = React.useState({
    pageNumber: 1,
    pageSize: 20,
    role: null as AccountRole | null,
    status: null as AccountStatus | null,
    search: null as string | null,
    includeDeleted: false,
  });

  const [selectedAccount, setSelectedAccount] = React.useState<Account | null>(null);
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);

  const { data, isLoading, isError, error, refetch } = useAccounts(params);
  const updateStatus = useUpdateAccountStatus();
  const deleteAccount = useDeleteAccount();

  const handleSearch = (value: string) => {
    setParams((prev) => ({
      ...prev,
      search: value || null,
      pageNumber: 1,
    }));
  };

  const handleFilterChange = (key: "role" | "status", value: string | null) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
      pageNumber: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, pageNumber: page }));
  };

  const handleViewAccount = (account: Account) => {
    setSelectedAccount(account);
    setDetailModalOpen(true);
  };

  const handleStatusChange = async (account: Account, status: AccountStatus) => {
    try {
      await updateStatus.mutateAsync({ id: account.id, payload: { status } });
      toast.success(t("accounts.statusUpdated"));
      void refetch();
    } catch (err) {
      const message = err instanceof Error && err.message 
        ? err.message 
        : tErrors("unknown");
      toast.error(message);
    }
  };

  const handleDeleteAccount = async (account: Account) => {
    if (!confirm(t("accounts.deleteConfirm", { email: account.email }))) {
      return;
    }
    try {
      await deleteAccount.mutateAsync(account.id);
      toast.success(t("accounts.deleted"));
      void refetch();
    } catch (err) {
      const message = err instanceof Error && err.message 
        ? err.message 
        : tErrors("unknown");
      toast.error(message);
    }
  };

  const roles: { value: AccountRole | ""; label: string }[] = [
    { value: "", label: t("accounts.allRoles") },
    { value: "owner", label: t("accounts.roleOwner") },
    { value: "provider", label: t("accounts.roleProvider") },
    { value: "admin", label: t("accounts.roleAdmin") },
  ];

  const statuses: { value: AccountStatus | ""; label: string }[] = [
    { value: "", label: t("accounts.allStatuses") },
    { value: "active", label: t("accounts.statusActive") },
    { value: "inactive", label: t("accounts.statusInactive") },
    { value: "pending", label: t("accounts.statusPending") },
    { value: "banned", label: t("accounts.statusBanned") },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {t("accounts.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("accounts.subtitle")}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={() => void refetch()}
        >
          <RefreshCw className="size-4" />
          {t("actions.refresh")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        {/* Search */}
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t("accounts.searchPlaceholder")}
            value={params.search || ""}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Role Filter */}
        <select
          value={params.role || ""}
          onChange={(e) => handleFilterChange("role", e.target.value || null)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {roles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={params.status || ""}
          onChange={(e) => handleFilterChange("status", e.target.value || null)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <EmptyState
          title={t("errors.loadFailed")}
          description={error instanceof Error ? error.message : t("errors.tryAgain")}
          icon={User}
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              {t("actions.retry")}
            </Button>
          }
        />
      ) : data && data.items.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("accounts.user")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("accounts.role")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("accounts.status")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("accounts.emailStatus")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("accounts.joined")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("accounts.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    onView={handleViewAccount}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteAccount}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            pageNumber={data.pageNumber}
            pageSize={data.pageSize}
            totalItems={data.totalItems}
            totalPages={data.totalPages}
            onPageChange={handlePageChange}
          />
        </>
      ) : (
        <EmptyState
          title={t("accounts.noResults")}
          description={t("accounts.noResultsDesc")}
          icon={User}
        />
      )}

      {/* Detail Modal */}
      <AccountDetailModal
        account={selectedAccount}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteAccount}
      />
    </div>
  );
}
