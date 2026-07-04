import { notFound } from "next/navigation";
import { DesignShowcase } from "./design-showcase";

export const metadata = {
  title: "Design playground",
  robots: { index: false, follow: false },
};

export default function DesignPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DesignShowcase />;
}
