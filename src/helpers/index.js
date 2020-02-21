const fs = require('fs-extra')
const { explore } = require('source-map-explorer')
const path = require('path')
const fetch = require('node-fetch')
const processData = require('./processData')
const handler = require('serve-handler')
const http = require('http')
const open = require('open')
const getPort = require('get-port')

const visualizeBundles = async ({ bundles, coverageFilePath, url }) => {
  console.log(`\n🖼️   Generating visualization...\n`)

  try {
    // await explore(bundles, {
    //   output: {
    //     format: 'html',
    //     filename: 'test.html'
    //   },
    //   coverage: coverageFilePath
    // })

    // return

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

    const port = await getPort({ port: [3000, 3001, 3002, 3003] })

    server.listen(port, () => {
      console.log(
        `🎊  Done! A visualization is running at: http://localhost:${port}`
      )
      open(`http://localhost:${port}`)
    })
  } catch (e) {
    console.error('❌  Failed to generate source map visualizationm')
    console.error(e)
  }
}

const downloadSourcemaps = async ({ urlToFileDict, url: baseUrl }) => {
  const urls = Object.keys(urlToFileDict)

  console.log('\n⬇️   Downloading sourcemaps...')

  let oneSourcemapDownloaded = false

  const firstPartyFailures = []

  // hack
  const normalizeHost = host => host.replace('www.', '')

  const baseHost = normalizeHost(new URL(baseUrl).host)

  const promises = urls.map(url => {
    const isFirstParty = normalizeHost(new URL(url).host) === baseHost
    return fetch(`${url}.map`)
      .then(response => response.json())
      .then(json => {
        oneSourcemapDownloaded = true
        fs.writeFileSync(`${urlToFileDict[url]}.map`, JSON.stringify(json))
      })
      .catch(error => {
        if (isFirstParty) firstPartyFailures.push(url)
        fs.removeSync(urlToFileDict[url])
        if (global.debug && !isFirstParty) {
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
    } else if (firstPartyFailures.length) {
      console.error(
        `\n🙅  Unable to download sourcemaps for the following asset urls. They will be removed from the analysis:\n\n${firstPartyFailures.join(
          '\n'
        )}`
      )
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
