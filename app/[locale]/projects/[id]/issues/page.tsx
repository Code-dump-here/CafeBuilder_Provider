"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useCurrentUser } from "@/features/auth/user-context";
import { useProjectDetail } from "@/features/projects/use-project-detail";
import {
  useIssues,
  useCreateIssueMutation,
  useUpdateIssueMutation,
  useSetIssueStatusMutation,
  useDeleteIssueMutation,
} from "@/features/projects/use-issues";

import type { Issue, IssueStatus } from "@/features/projects/issue-types";

import {
  AddIssueModal,
  type AddIssueInput,
} from "@/components/contractor/issue-management/add-issue-modal";
import {
  EditIssueModal,
  type EditIssueInput,
} from "@/components/contractor/issue-management/edit-issue-modal";
import { IssueGroup } from "@/components/contractor/issue-management/issue-group";
import { IssueToolbar } from "@/components/contractor/issue-management/issue-toolbar";
import { IssueEmptyState } from "@/components/contractor/issue-management/issue-empty-state";
import { IssueDetailPanel } from "@/components/contractor/issue-management/issue-detail-panel";

const STATUS_ORDER: IssueStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];

/**
 * Project-scoped issues page (`/[locale]/projects/[id]/issues`).
 *
 * Master-detail layout:
 *   ┌───────────────────────────────┬─────────────────────┐
 *   │ IssueToolbar                  │                     │
 *   ├───────────────────────────────┤   IssueDetailPanel  │
 *   │ IssueGroup (open)             │   (sticky on lg+)   │
 *   │ IssueGroup (in_progress)      │                     │
 *   │ IssueGroup (resolved)         │                     │
 *   │ IssueGroup (closed)           │                     │
 *   └───────────────────────────────┴─────────────────────┘
 *
 * Selecting a row sets `detailTarget`; the right column reacts.
 * On small screens the panel stacks below the list.
 */
export default function IssuesPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("MilestoneManagement.issue");

  const projectIdParam = params?.id ?? "";

  const {
    project,
    isLoading: isLoadingProject,
    isError: isProjectError,
  } = useProjectDetail(projectIdParam);

  // Gate on `contractType` (hired-for), not `capability` (able-to) — see the
  // same resolution in `milestones/page.tsx`. Also scoped by the viewer's
  // own providerId so another provider's engagement on the same project
  // can never drive this page — project.providers lists every provider on
  // the project, not just the caller. Prefer an `accepted` engagement over
  // a still-`requested` invitation.
  const { account } = useCurrentUser();
  const viewerProfileId = account?.serviceProvider?.id ?? null;
  const projectWorkingId = React.useMemo(() => {
    const candidates = project.providers.filter(
      (p) =>
        p.providerId === viewerProfileId &&
        (p.contractType === "construction" || p.contractType === "both") &&
        (p.status === "accepted" || p.status === "requested"),
    );
    const eng =
      candidates.find((p) => p.status === "accepted") ?? candidates[0];
    return eng?.projectWorkingId;
  }, [project.providers, viewerProfileId]);

  const {
    items: issues,
    isLoading: isLoadingIssues,
    isError: isIssuesError,
    error: issuesError,
    refetch: refetchIssues,
  } = useIssues({
    projectWorkingId: projectWorkingId ?? "",
    enabled: Boolean(projectWorkingId),
  });

  const createIssue = useCreateIssueMutation({
    onSuccessSideEffect: () => void refetchIssues(),
  });
  const updateIssue = useUpdateIssueMutation({
    onSuccessSideEffect: () => void refetchIssues(),
  });
  const setStatus = useSetIssueStatusMutation({
    onSuccessSideEffect: () => void refetchIssues(),
  });
  const deleteIssue = useDeleteIssueMutation({
    onSuccessSideEffect: () => void refetchIssues(),
  });

  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Issue | null>(null);
  // Store only the id and look the issue up from the list. Holding the whole
  // object meant it went stale on every refetch, which needed an effect to
  // copy fresh data back into state; deriving keeps it current for free.
  const [detailTargetId, setDetailTargetId] = React.useState<string | null>(null);
  const detailTarget = React.useMemo(
    () =>
      detailTargetId == null
        ? null
        : issues.find((i) => i.id === detailTargetId) ?? null,
    [issues, detailTargetId],
  );

  const handleAdd = async (input: AddIssueInput) => {
    if (!projectWorkingId) return;
    await createIssue.mutateAsync({
      projectWorkingId,
      issueTypeId: input.issueTypeId,
      cause: input.cause || undefined,
      reason: input.reason || undefined,
      solution: input.solution || undefined,
      estimateAt: input.estimateAt ?? undefined,
      issueImage: input.issueImage ?? undefined,
      confirmImage: input.confirmImage ?? undefined,
    });
  };

  const handleEdit = async (id: string, input: EditIssueInput) => {
    await updateIssue.mutateAsync({
      id,
      payload: {
        issueTypeId: input.issueTypeId,
        cause: input.cause,
        reason: input.reason,
        solution: input.solution,
        estimateAt: input.estimateAt ?? undefined,
        issueImage: input.issueImage || "",
        confirmImage: input.confirmImage || "",
      },
    });
  };

  const handleChangeStatus = async (id: string, next: IssueStatus) => {
    await setStatus.mutateAsync({ id, payload: { status: next } });
    // No local patch needed — `detailTarget` is derived from the list, so the
    // refreshed status flows straight through.
  };

  const handleDelete = async (issue: Issue) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    await deleteIssue.mutateAsync(issue.id);
    if (detailTargetId === issue.id) setDetailTargetId(null);
  };

  const handleSelectIssue = React.useCallback((issue: Issue) => {
    setDetailTargetId(issue.id);
  }, []);

  // Counts derived from the full list. Mirrors the milestone
  // toolbar's "totalTasks / doneTasks" pills.
  const counts = React.useMemo(() => {
    const c: Partial<Record<IssueStatus, number>> = {};
    for (const s of STATUS_ORDER) c[s] = 0;
    for (const issue of issues) c[issue.status] = (c[issue.status] ?? 0) + 1;
    return c;
  }, [issues]);

  const grouped = React.useMemo(() => {
    const map: Record<IssueStatus, Issue[]> = {
      open: [],
      in_progress: [],
      resolved: [],
      closed: [],
    };
    for (const issue of issues) {
      map[issue.status].push(issue);
    }
    return map;
  }, [issues]);

  const openCount = (counts.open ?? 0) + (counts.in_progress ?? 0);
  const resolvedCount = (counts.resolved ?? 0) + (counts.closed ?? 0);

  // ── Render guards ──────────────────────────────────────────────────────────

  if (isLoadingProject || (Boolean(projectWorkingId) && isLoadingIssues)) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isProjectError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
        <AlertTriangle className="size-6 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load project.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (isIssuesError) {
    const message = issuesError?.message ?? "Failed to load issues.";
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
        <AlertTriangle className="size-6 text-destructive" />
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetchIssues()}
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (!projectWorkingId) {
    return (
      <>
        <IssueToolbar
          projectId={projectIdParam}
          totalCount={0}
          openCount={0}
          resolvedCount={0}
          onReport={() => {
            /* no construction engagement: report is a no-op */
          }}
        />
        <p className="mt-3 rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
          {t("noConstructionEngagement")}
        </p>
      </>
    );
  }

  if (issues.length === 0) {
    return (
      <>
        <IssueToolbar
          projectId={projectIdParam}
          totalCount={0}
          openCount={0}
          resolvedCount={0}
          onReport={() => setAddOpen(true)}
        />
        <div className="mt-3">
          <IssueEmptyState
            hasFilter={false}
            onReport={() => setAddOpen(true)}
          />
        </div>

        <AddIssueModal
          open={addOpen}
          onOpenChange={setAddOpen}
          onSubmit={handleAdd}
          isSubmitting={createIssue.isPending}
        />

        <EditIssueModal
          issue={editTarget}
          open={editTarget !== null}
          onOpenChange={(o) => {
            if (!o) setEditTarget(null);
          }}
          onSubmit={handleEdit}
          isSubmitting={updateIssue.isPending}
        />
      </>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <>
      <IssueToolbar
        projectId={projectIdParam}
        totalCount={issues.length}
        openCount={openCount}
        resolvedCount={resolvedCount}
        onReport={() => setAddOpen(true)}
      />

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] xl:grid-cols-[minmax(0,1fr)_minmax(420px,540px)]">
        {/* LEFT — issue list grouped by status */}
        <div className="flex min-w-0 flex-col gap-3">
          {STATUS_ORDER.map((status) => (
            <IssueGroup
              key={status}
              status={status}
              issues={grouped[status]}
              activeId={detailTarget?.id ?? null}
              onOpen={handleSelectIssue}
              onEdit={(it) => setEditTarget(it)}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {/* RIGHT — inline detail panel, sticky on lg+ so it stays
            visible while the list scrolls. */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="lg:max-h-[calc(100dvh-2rem)]">
            <IssueDetailPanel
              issue={detailTarget}
              onChangeStatus={handleChangeStatus}
              onEdit={(it) => setEditTarget(it)}
              onClose={() => setDetailTargetId(null)}
              isChangingStatus={setStatus.isPending}
            />
          </div>
        </div>
      </div>

      <AddIssueModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={handleAdd}
        isSubmitting={createIssue.isPending}
      />

      <EditIssueModal
        issue={editTarget}
        open={editTarget !== null}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null);
        }}
        onSubmit={handleEdit}
        isSubmitting={updateIssue.isPending}
      />
    </>
  );
}
