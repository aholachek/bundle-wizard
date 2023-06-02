const fs = require('fs-extra')
const https = require('https')
const { getSourcemapUrl } = require('./utils')

const downloadSourcemaps = async ({ urlToFileDict, ignoreHTTPSErrors }) => {
  // require() of ES Module not supported.
  const { default: fetch } = await import('node-fetch')

  const urls = Object.keys(urlToFileDict)

  console.log('\n⬇️   Downloading sourcemaps...')

  let oneSourcemapDownloaded = false

  const scriptsWithoutSourcemaps = {}

  const ignoreHTTPSErrorsAgent = new https.Agent({
    rejectUnauthorized: false
  })

  const promises = urls.map(url => {
    const sourcemapUrl = getSourcemapUrl(urlToFileDict[url], url)
    return fetch(sourcemapUrl, {
      agent: ignoreHTTPSErrors ? ignoreHTTPSErrorsAgent : undefined,
      timeout: 5000
    })
      .then(response => response.json())
      .then(json => {
        const stringified = JSON.stringify(json)
        if (stringified.length < 5) throw new Error('invalid map')
        oneSourcemapDownloaded = true
        fs.writeFileSync(`${urlToFileDict[url]}.map`, stringified)
      })
      .catch(error => {
        scriptsWithoutSourcemaps[url] = urlToFileDict[url]
        if (global.debug) {
          console.error(`\nUnable to download sourcemap: ${sourcemapUrl}\n`)
          console.error(error)

          if (error.statusCode)
            console.error(`Request failed with statuscode: ${error.statusCode}`)
        }
      })
  })

  await Promise.all(promises).then(() => {
    if (!oneSourcemapDownloaded) {
      console.error(
        `⚠️  No sourcemaps could be downloaded, analysis cannot proceed.`
      )
      process.exit()
    }
  })
  return scriptsWithoutSourcemaps
}

module.exports = downloadSourcemaps
