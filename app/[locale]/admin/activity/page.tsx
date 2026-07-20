import { ActivityFeed } from "@/components/admin/activity-feed";
import { PageHead } from "@/components/admin/page-head";
import { ADMIN_ACTIVITY } from "@/lib/admin/admin-mock-data";

export default function AdminActivityPage() {
  return (
    <>
      <PageHead
        title="Activity"
        description="Every recorded action across accounts, projects, and designs."
      />
      <div className="rounded-lg border border-border/60 bg-card/60 p-5 shadow-sm">
        <ActivityFeed items={ADMIN_ACTIVITY} />
      </div>
    </>
  );
}