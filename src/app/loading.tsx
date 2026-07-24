export default function GlobalLoading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center p-8" role="status" aria-label="Loading">
      <div className="h-10 w-10 rounded-full border-4 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] animate-spin" />
    </div>
  )
}
