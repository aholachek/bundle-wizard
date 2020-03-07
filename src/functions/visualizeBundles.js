const fs = require('fs-extra')
const { explore } = require('source-map-explorer')
const path = require('path')

const processSourceMapExplorerData = require('./processSourceMapExplorerDataIntoTreemap')
const handler = require('serve-handler')
const http = require('http')
const open = require('open')
const getPort = require('get-port')

const visualizeBundles = async ({
  bundles,
  coverageFilePath,
  url,
  scriptsWithoutSourcemapsDict,
  priorities
}) => {
  console.log(`\n🖼️   Generating visualization...\n`)

  try {
    const data = await explore(bundles, {
      output: {
        format: 'json'
      },
      coverage: coverageFilePath
    })

    const tempFolder = path.join(__dirname, '..', '..', 'temp')
    const distFolder = path.join(__dirname, '..', '..', 'dist')
    const processedData = processSourceMapExplorerData(
      data.bundles,
      scriptsWithoutSourcemapsDict
    )
    const fileName = `${tempFolder}/treeData.json`

    const getFileName = url => url.split(/\//g).slice(-1)[0]

    processedData.children.forEach(bundle => {
      bundle.request = priorities.find(priority => {
        if (!priority.url) return
        return (
          priority.url === bundle.name ||
          getFileName(priority.url) === bundle.name
        )
      })
    })

    Object.assign(processedData, { url, priorities })

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

module.exports = visualizeBundles
