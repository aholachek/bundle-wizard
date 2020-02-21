#!/usr/bin/env node

const fs = require('fs-extra')
const argv = require('yargs').argv
const path = require('path')
const downloadCoverage = require('./download-coverage')

const { visualizeBundles, downloadSourcemaps } = require('./helpers')

const tempFolderName = path.join(__dirname, '..', 'temp')

const coverageFilePath = `${tempFolderName}/coverage.json`

const downloadsDir = `${tempFolderName}/downloads`

fs.removeSync(downloadsDir)
fs.mkdirp(downloadsDir)

const main = async () => {
  console.log(`\n🧙‍  Welcome to bundle-wizard\n`)

  let urlToFileDict, url

  if (argv.debug) global.debug = true

  try {
    const downloadedData = await downloadCoverage({
      url: (argv._ && argv._[0]) || argv.url,
      type: argv.desktop ? 'desktop' : 'mobile',
      interact: argv.interact,
      downloadsDir,
      coverageFilePath,
      tempFolderName
    })
    urlToFileDict = downloadedData.urlToFileDict
    url = downloadedData.url
  } catch (e) {
    console.error('\n❌  Unable to fetch website data\n')
    console.error(e)
    process.exit()
  }

  const coverageFileStats = fs.statSync(coverageFilePath)

  if (coverageFileStats['size'] === 0) {
    console.error(
      '❌  The coverage file is empty. Please try again with a new file.'
    )
    process.exit()
  }

  await downloadSourcemaps({
    downloadsDir,
    urlToFileDict,
    url
  })

  const jsonFileName = `${tempFolderName}/sourcemap-analysis.json`

  if (fs.existsSync(jsonFileName)) {
    fs.unlinkSync(jsonFileName)
  }

  visualizeBundles({
    bundles: `${downloadsDir}/*`,
    jsonFileName,
    downloadsDir,
    coverageFilePath,
    url
  })
}

main()
