const fs = require('fs-extra')
const https = require('https')
const fetch = require('node-fetch')

const downloadSourcemaps = async ({
  urlToFileDict,
  url: baseUrl,
  ignoreHTTPSErrors
}) => {
  const urls = Object.keys(urlToFileDict)

  console.log('\n⬇️   Downloading sourcemaps...')

  let oneSourcemapDownloaded = false

  const scriptsWithoutSourcemaps = {}

  const firstPartyFailures = []

  // hack
  const normalizeHost = host => host.replace('www.', '')

  const baseHost = normalizeHost(new URL(baseUrl).host)

  const ignoreHTTPSErrorsAgent = new https.Agent({
    rejectUnauthorized: false
  })

  const promises = urls.map(url => {
    const urlInstance = new URL(url)
    const isFirstParty = normalizeHost(urlInstance.host) === baseHost
    return fetch(`${url}.map`, {
      agent: ignoreHTTPSErrors ? ignoreHTTPSErrorsAgent : undefined
    })
      .then(response => response.json())
      .then(json => {
        oneSourcemapDownloaded = true
        fs.writeFileSync(`${urlToFileDict[url]}.map`, JSON.stringify(json))
      })
      .catch(error => {
        scriptsWithoutSourcemaps[url] = urlToFileDict[url]
        if (isFirstParty) firstPartyFailures.push(url)
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
        `❌  No sourcemaps could be downloaded, analysis cannot proceed.`
      )
      process.exit()
    } else if (firstPartyFailures.length) {
      console.error(
        `\n🙅  Unable to download sourcemaps for the following urls. They will be removed from the analysis:\n\n${firstPartyFailures.join(
          '\n'
        )}`
      )
    }
  })
  return scriptsWithoutSourcemaps
}

module.exports = downloadSourcemaps
