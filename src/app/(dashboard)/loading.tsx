export default function DashboardLoading() {
  return (
    <div className="space-y-4 animate-pulse p-2" role="status" aria-label="Loading dashboard">
      <div className="h-8 w-48 bg-gray-200 rounded-lg" />
      <div className="h-24 bg-gray-100 rounded-2xl" />
      <div className="h-24 bg-gray-100 rounded-2xl" />
      <div className="h-40 bg-gray-100 rounded-2xl" />
    </div>
  )
}
