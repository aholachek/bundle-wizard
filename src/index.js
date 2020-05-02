#!/usr/bin/env node
const fs = require('fs-extra')
const argv = require('yargs').argv
const path = require('path')
const downloadCoverage = require('./functions/downloadCoverage')
const processTracing = require('./functions/processTracing')
const downloadSourcemaps = require('./functions/downloadSourcemaps')
const visualizeBundles = require('./functions/visualizeBundles')
const findCoveragePercent = require('./functions/calculateCoverage')
const mapToOriginalFiles = require('./functions/mapToOriginalFiles')
const tempFolderName = path.join(__dirname, '..', 'temp')
const coverageFilePath = `${tempFolderName}/coverage.json`
const downloadsDir = `${tempFolderName}/downloads`

fs.removeSync(downloadsDir)
fs.mkdirp(downloadsDir)

const main = async () => {
  console.log(`\n🧙‍  Welcome to bundle-wizard\n`)

  let urlToFileDict, url, tracing

  if (argv.debug) global.debug = true

  const ignoreHTTPSErrors = argv.ignoreHTTPSErrors || false

  try {
    const downloadedData = await downloadCoverage({
      url: (argv._ && argv._[0]) || argv.url,
      ignoreHTTPSErrors,
      type: argv.desktop ? 'desktop' : 'mobile',
      interact: argv.interact,
      downloadsDir,
      coverageFilePath,
      tempFolderName,
    })
    urlToFileDict = downloadedData.urlToFileDict
    ;(url = downloadedData.url), (tracing = downloadedData.tracing)
  } catch (e) {
    console.error('\n⚠️  Unable to fetch website data\n')
    console.error(e)
    process.exit()
  }

  const coverageFileStats = fs.statSync(coverageFilePath)

  if (coverageFileStats['size'] === 0) {
    console.error(
      '⚠️  The coverage file is empty. Please try again with a new file.'
    )
    process.exit()
  }

  // an object of { url : localFileName } pairs
  const scriptsWithoutSourcemapsDict = await downloadSourcemaps({
    downloadsDir,
    urlToFileDict,
    url,
    ignoreHTTPSErrors,
  })

  const coverageArr = require(coverageFilePath)

  Object.keys(scriptsWithoutSourcemapsDict).forEach((url) => {
    const localFile = scriptsWithoutSourcemapsDict[url]
    const size = fs.statSync(localFile).size
    const coverageEntry = coverageArr.find((c) => {
      return c.url === url
    })

    if (!coverageEntry) {
      scriptsWithoutSourcemapsDict[url] = {
        size,
        coveragePercent: 'N/A',
      }
    } else {
      scriptsWithoutSourcemapsDict[url] = {
        size,
        coveragePercent: findCoveragePercent(size, coverageEntry.ranges),
      }
    }
    // we don't need the file going forward
    fs.removeSync(localFile)
  })

  await new Promise((resolve, reject) => {
    // get rid of file hashes
    fs.readdir(downloadsDir, (err, files) => {
      files.forEach((file) => {
        fs.renameSync(
          `${downloadsDir}/${file}`,
          `${downloadsDir}/${file.split('--')[1]}`
        )
      })
      resolve()
    })
  })

  const { priorities, longTasks } = await processTracing(
    JSON.parse(tracing),
    downloadsDir
  )

  await mapToOriginalFiles({downloadsDir, tempFolderName})

  const jsonFileName = `${tempFolderName}/sourcemap-analysis.json`

  if (fs.existsSync(jsonFileName)) {
    fs.unlinkSync(jsonFileName)
  }

  visualizeBundles({
    bundles: `${downloadsDir}/*`,
    jsonFileName,
    downloadsDir,
    coverageFilePath,
    url,
    scriptsWithoutSourcemapsDict,
    priorities,
    longTasks,
  })
}

main()
