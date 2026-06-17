import { BookPageContent } from "@/components/booking/book-page-content";
import { fetchBookingServices } from "@/lib/booking/fetch-services";

type BookPageProps = {
  searchParams: Promise<{ service?: string }>;
};

export default async function BookPage({ searchParams }: BookPageProps) {
  const { service } = await searchParams;
  const services = await fetchBookingServices();

  return (
    <BookPageContent initialServiceId={service} initialServices={services} />
  );
}
