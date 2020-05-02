const fs = require('fs-extra')
const https = require('https')
const fetch = require('node-fetch')

const downloadSourcemaps = async ({
  urlToFileDict,
  url: baseUrl,
  ignoreHTTPSErrors,
}) => {
  const urls = Object.keys(urlToFileDict)

  console.log('\n⬇️   Downloading sourcemaps...')

  let oneSourcemapDownloaded = false

  const scriptsWithoutSourcemaps = {}

  const ignoreHTTPSErrorsAgent = new https.Agent({
    rejectUnauthorized: false,
  })

  const promises = urls.map(url => {
    return fetch(`${url}.map`, {
      agent: ignoreHTTPSErrors ? ignoreHTTPSErrorsAgent : undefined,
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
          console.error(`\nUnable to download sourcemap: ${url}.map\n`)
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
