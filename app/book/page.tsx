import { BookPageContent } from "@/components/booking/book-page-content";

type BookPageProps = {
  searchParams: Promise<{ service?: string }>;
};

export default async function BookPage({ searchParams }: BookPageProps) {
  const { service } = await searchParams;
  return <BookPageContent initialServiceId={service} />;
}
