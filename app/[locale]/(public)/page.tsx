import { ModeToggle } from "@/components/ui/theme-toggle";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("HomePage");
  return (
    <div className="p-4">
      <ModeToggle />
      <div>
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
      </div>
    </div>
  );
}
