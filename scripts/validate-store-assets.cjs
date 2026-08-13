async function run() {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const root = path.resolve(__dirname, '..')
  const expected = new Map([
    ['artifacts/app-store/google-feature-graphic.png', [1024, 500]],
    ['artifacts/app-store/google-play-icon-512.png', [512, 512]],
    ['ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png', [1024, 1024]],
  ])

  function pngDimensions(filePath) {
    const buffer = fs.readFileSync(filePath)
    if (buffer.readUInt32BE(0) !== 0x89504e47 || buffer.readUInt32BE(4) !== 0x0d0a1a0a) {
      throw new Error(`${filePath} is not a PNG`)
    }
    return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)]
  }

  for (const [relativePath, dimensions] of expected) {
    const filePath = path.join(root, relativePath)
    if (!fs.existsSync(filePath)) throw new Error(`missing store asset: ${relativePath}`)
    const actual = pngDimensions(filePath)
    if (actual[0] !== dimensions[0] || actual[1] !== dimensions[1]) {
      throw new Error(`${relativePath} is ${actual.join('x')}; expected ${dimensions.join('x')}`)
    }
  }

  console.log(`Store assets valid (${expected.size} PNGs)`)
}

run().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
