const fs = require('fs-extra')
const { explore } = require('source-map-explorer')
const path = require('path')
const request = require('request-promise-native')
const processData = require('./processData')
const handler = require('serve-handler')
const http = require('http')

const visualizeBundles = async ({ bundles, coverageFilePath, url }) => {
  console.log(
    `\n🔮  Generating visualization...\n\n⏳  This might take a while, depending on the complexity of the website being analyzed\n`
  )

  try {
    const data = await explore(bundles, {
      output: {
        format: 'json'
      },
      coverage: coverageFilePath
    })

    const tempFolder = path.join(__dirname, '..', '..', 'temp')
    const distFolder = path.join(__dirname, '..', '..', 'dist')
    const processedData = processData(data.bundles)
    const fileName = `${tempFolder}/treeData.json`
    processedData.url = url
    fs.writeFileSync(fileName, JSON.stringify(processedData))
    fs.copySync(fileName, `${distFolder}/treeData.json`)
    fs.copySync(`${tempFolder}/screenshot.png`, `${distFolder}/screenshot.png`)

    const server = http.createServer((request, response) => {
      return handler(request, response, {
        public: distFolder
      })
    })

    server.listen(3000, () => {
      console.log(
        '🎊  Done! A source map visualization is running at:\n\nhttp://localhost:3000'
      )
    })
  } catch (e) {
    console.error('❌  Failed to generate source map visualizationm')
    console.error(e)
  }
}

const downloadSourcemaps = async ({ urlToFileDict }) => {
  const urls = Object.keys(urlToFileDict)

  console.log('\n⬇️   Downloading sourcemaps...')

  let oneSourcemapDownloaded = false

  const promises = urls.map(url => {
    return request({
      gzip: true,
      uri: `${url}.map`
    })
      .then(response => {
        oneSourcemapDownloaded = true
        fs.writeFileSync(`${urlToFileDict[url]}.map`, response)
      })
      .catch(error => {
        fs.removeSync(urlToFileDict[url])
        if (global.debug) {
          console.error(
            `\nUnable to download sourcemap: ${url}.map (this might not be an actual problem)\n`
          )

          if (error.statusCode)
            console.error(`Request failed with statuscode: ${error.statusCode}`)
        }
      })
  })

  await Promise.all(promises).then(() => {
    if (!oneSourcemapDownloaded) {
      console.error(
        `❌  No sourcemaps could be downloaded, analysis cannot proceed.`
      )
      process.exit()
    }
  })
}

const delay = t => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, t)
  })
}

module.exports = {
  visualizeBundles,
  downloadSourcemaps,
  delay
}
