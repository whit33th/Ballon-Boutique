import { notFound } from "next/navigation";
import { SelectedGroupShowcase } from "@/components/categories/CategoryShowcases";
import {
  CATEGORY_GROUP_SLUGS,
  PRODUCT_CATEGORY_GROUPS,
  SLUG_TO_CATEGORY_GROUP,
} from "@/constants/categories";

const STATIC_SLUGS = Object.values(CATEGORY_GROUP_SLUGS) as Array<
  (typeof CATEGORY_GROUP_SLUGS)[keyof typeof CATEGORY_GROUP_SLUGS]
>;

export function generateStaticParams() {
  return STATIC_SLUGS.map((category) => ({ category }));
}

export default async function CategoryLandingPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  console.log(params);
  const groupValue = SLUG_TO_CATEGORY_GROUP[category];
  if (!groupValue) {
    console.log(params);
    notFound();
  }

  const group = PRODUCT_CATEGORY_GROUPS.find(
    (candidate) => candidate.value === groupValue,
  );

  if (!group) {
    notFound();
  }

  return <SelectedGroupShowcase group={group} />;
}
