import { ActivityFeed } from "@/components/admin/activity-feed";
import { PageHead } from "@/components/admin/page-head";
import { ADMIN_ACTIVITY } from "@/lib/admin/admin-mock-data";
import { getTranslations } from "next-intl/server";

export default async function AdminActivityPage() {
  const t = await getTranslations("Admin.activity");
  return (
    <>
      <PageHead title={t("title")} description={t("description")} />
      <div className="rounded-lg border border-border/60 bg-card/60 p-5 shadow-e1">
        <ActivityFeed items={ADMIN_ACTIVITY} />
      </div>
    </>
  );
}