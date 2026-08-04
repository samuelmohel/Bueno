import BookingDetailClient from './BookingDetailClient';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default function BookingDetailPage() {
  return <BookingDetailClient />;
}
