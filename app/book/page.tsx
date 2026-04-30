import BookForm from './BookForm'

export default function BookPage() {
  const businessName = process.env.LINE_BUSINESS_NAME ?? '美業預約'
  return <BookForm businessName={businessName} />
}
