import { readFileSync } from 'node:fs'
import path from 'node:path'

export default function PrivacyPolicyPage() {
  const policy = readFileSync(path.join(process.cwd(), 'privacy-policy.md'), 'utf8')

  return (
    <main className="min-h-screen bg-[var(--color-background)] px-4 py-12 sm:px-6">
      <article className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-xl sm:p-10">
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-gray-700">
          {policy}
        </pre>
      </article>
    </main>
  )
}
