const fs = require('fs-extra')
const sourceMap = require('source-map')
const { v4: uuidv4 } = require('uuid')

async function mapToOriginalFiles({ downloadsDir, tempFolderName }) {
  const originalFilesDir = `${tempFolderName}/originalFiles`
  const files = fs.readdirSync(downloadsDir)

  try {
    fs.mkdirpSync(originalFilesDir)

    const sourcemapFiles = files.filter(file => file.match(/.map$/))

    const allFiles = {}

    const promises = sourcemapFiles.map(async file => {
      try {
        const sourcemapFileContents = fs.readFileSync(
          `${downloadsDir}/${file}`,
          'utf8'
        )
        const consumer = await new sourceMap.SourceMapConsumer(
          sourcemapFileContents
        )

        consumer.sources.forEach(fileName => {
          const id = uuidv4()
          allFiles[fileName] = id

          fs.writeFileSync(
            `${originalFilesDir}/${id}.json`,
            JSON.stringify(consumer.sourceContentFor(fileName))
          )
        })
        consumer.destroy()
      } catch (e) {}
    })

    await Promise.all(promises)

    // TODO: finish allowing json to be rendered on the front end
    // try {
    //   const jsonFiles = files.filter(file => file.match(/.json$/))

    //   jsonFiles.forEach(file => {
    //     fs.copySync(`${downloadsDir}/${file}`, `${originalFilesDir}/${file}`)
    //   })
    // } catch (e) {}

    fs.writeFileSync(
      `${tempFolderName}/originalFileMapping.json`,
      JSON.stringify(allFiles)
    )
  } catch (e) {
    console.error(e)
    fs.writeFileSync(
      `${tempFolderName}/originalFileMapping.json`,
      JSON.stringify({})
    )
  }
}

module.exports = mapToOriginalFiles
