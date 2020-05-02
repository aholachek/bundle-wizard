const fs = require('fs-extra')
const sourceMap = require('source-map')

async function mapToOriginalFiles({ downloadsDir, tempFolderName }) {
  const files = fs.readdirSync(downloadsDir)

  const sourcemapFiles = files.filter((file) => file.match(/.map$/))

  const allFiles = {}

  const promises = sourcemapFiles.map(async (file) => {
    try {
      const sourcemapFileContents = fs.readFileSync(
        `${downloadsDir}/${file}`,
        'utf8'
      )
      const consumer = await new sourceMap.SourceMapConsumer(
        sourcemapFileContents
      )

      consumer.sources.forEach((fileName) => {
        allFiles[fileName] = consumer.sourceContentFor(fileName)
      })
      consumer.destroy()
    } catch (e) {}
  })

  await Promise.all(promises)

  fs.writeFileSync(
    `${tempFolderName}/originalFileMapping.json`,
    JSON.stringify(allFiles)
  )
}

module.exports = mapToOriginalFiles
