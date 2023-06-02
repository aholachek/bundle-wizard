const fs = require('fs-extra')
const argv = require('yargs').argv
const path = require('path')
const { explore } = require('source-map-explorer')
const handler = require('serve-handler')
const http = require('http')
const processSourceMapExplorerData = require('./processSourceMapExplorerDataIntoTreemap')
const { Confirm } = require('enquirer')

const visualizeBundles = async ({
  bundles,
  coverageFilePath,
  url,
  scriptsWithoutSourcemapsDict,
  priorities,
  longTasks
}) => {
  console.log(`\n🖼️   Generating visualization...\n`)

  try {
    // require() of ES Module not supported.
    const { default: open } = await import('open')
    const { default: getPort } = await import('get-port')

    const data = await explore(bundles, {
      output: {
        format: 'json'
      },
      coverage: coverageFilePath
    })

    const tempFolder = path.join(__dirname, '..', '..', 'temp')
    const distFolder = path.join(__dirname, '..', '..', 'dist')
    const shareFolder = path.join(__dirname, '..', '..', 'shareable', 'dist')
    const processedData = processSourceMapExplorerData(
      data.bundles,
      scriptsWithoutSourcemapsDict
    )
    const fileName = `${tempFolder}/treeData.json`

    const getFileName = url => (url ? url.split(/\//g).slice(-1)[0] : '')

    processedData.children.forEach(bundle => {
      bundle.request = priorities.find(priority => {
        if (!priority.url) return
        return (
          priority.url === bundle.name ||
          getFileName(priority.url) === bundle.name
        )
      })
      const bundleLongTasks = longTasks.filter(task => {
        return (
          task.attributableURLs.find(n => n === bundle.name) ||
          task.attributableURLs.map(getFileName).find(n => n === bundle.name)
        )
      })
      if (bundleLongTasks.length) {
        // just take  the longest
        bundle.longTask = bundleLongTasks
          .map(task => task.duration)
          .reduce((acc, curr) => {
            if (curr > acc) return curr
            return acc
          }, 0)
      }
    })

    Object.assign(processedData, { url })

    fs.writeFileSync(fileName, JSON.stringify(processedData))
    fs.copySync(fileName, `${distFolder}/treeData.json`)
    fs.copySync(
      `${tempFolder}/originalFileMapping.json`,
      `${distFolder}/originalFileMapping.json`
    )
    fs.copySync(`${tempFolder}/originalFiles`, `${distFolder}/originalFiles`)
    fs.copySync(`${tempFolder}/screenshot.png`, `${distFolder}/screenshot.png`)

    const server = http.createServer((request, response) => {
      return handler(request, response, {
        public: distFolder
      })
    })

    const port =
      parseInt(argv.port, 10) ||
      (await getPort({ port: [3000, 3001, 3002, 3003] }))

    server.listen(port, async () => {
      console.log(
        `🎊  Done! A visualization is running at: http://localhost:${port}\n`
      )
      open(`http://localhost:${port}`)

      const sharePrompt = new Confirm({
        name: 'question',
        message:
          'Type "y" to generate a deployable folder in order to share or save this visualization, otherwise type "n" when you\'re ready to quit bundle-wizard'
      })

      let response

     try {
        response = await sharePrompt.run()
        // have to add this catch to get ctrl + c to work for some reason
     } catch (e) {
       console.log(e)
       return process.exit()
     }

      if (response) {
        fs.mkdirs(shareFolder)

        fs.readdir(distFolder, (err, files) => {
          if (err) return console.error(err)
          files.forEach(file => {
            if (file.match('originalFile')) return
            fs.copySync(`${distFolder}/${file}`, `${shareFolder}/${file}`)
          })

          open(path.join(__dirname, '..', '..', 'shareable'))

          console.log(
            `\nThe shareable visualization site files are located in: \n\n📂  ${shareFolder} \n\n type ctrl+c when you're ready to quit bundle-wizard\n`
          )
        })
      } else {
        server.close()
      }
    })
  } catch (e) {
    console.error('⚠️  Failed to generate source map visualization')
    console.error(e)
  }
}

module.exports = visualizeBundles
