import Navbar from "@/components/navbar/navbar";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("HomePage");
  return (
    <>
      <Navbar />
    </>
  );
}
