import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'

type Manifest = {
  icons: Array<{ src: string; sizes: string; type: string }>
}

test('PWA manifest icons resolve to committed public assets', async () => {
  const manifest = JSON.parse(
    await readFile(resolve(process.cwd(), 'src/app/manifest.json'), 'utf8'),
  ) as Manifest

  assert.ok(manifest.icons.length > 0)
  for (const icon of manifest.icons) {
    assert.match(icon.src, /^\/icons\/.+\.png$/)
    assert.equal(icon.type, 'image/png')
    await assert.doesNotReject(readFile(resolve(process.cwd(), 'public', icon.src.slice(1))))
  }
})
