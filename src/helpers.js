const fs = require('fs-extra')
const { explore } = require('source-map-explorer')
const open = require('open')
const request = require('request-promise-native')

const visualizeBundles = ({ bundles, htmlFileName, coverageFilePath }) => {
  console.log(
    `\n⏳  Generating sourcemap visualization (this might take up to a few minutes...)\n`
  )

  explore(bundles, {
    output: {
      format: 'html',
      filename: htmlFileName
    },
    coverage: coverageFilePath
  })
    .then(() => {
      open(htmlFileName)
      console.log(
        `🎊  Done! A source map visualization should pop up in your default browser.\n`
      )
    })
    .catch(e => {
      console.error('❌ Failed to generate source map visualization')
      if (debug) console.error(e)
    })
}

const downloadSourcemaps = async ({ urlToFileDict }) => {
  const urls = Object.keys(urlToFileDict)

  console.log('\n⬇️  Downloading sourcemaps...')

  let sourcemapDownloaded = false

  const promises = urls.map(url => {
    return request({
      gzip: true,
      uri: `${url}.map`
    })
      .then(response => {
        sourcemapDownloaded = true
        fs.writeFileSync(`${urlToFileDict[url]}.map`, response)
      })
      .catch(error => {
        fs.removeSync(urlToFileDict[url])
        if (global.debug)
          console.error(
            `\nUnable to download sourcemap: ${url}.map (this might not be an actual problem)\n`
          )
        console.error(error)
      })
  })

  if (!sourcemapDownloaded) {
    console.error(`❌  No sourcemaps could be downloaded, analysis cannot proceed.`)
    process.exit()
  }

  await Promise.all(promises)
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
