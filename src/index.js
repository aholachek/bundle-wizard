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
  console.log(`\n 🧙‍  Welcome to sourcemap-wizard\n`)

  let urlToFileDict

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
    urlToFileDict
  })

  const htmlFileName = `${tempFolderName}/sourcemap-analysis.html`

  if (fs.existsSync(htmlFileName)) {
    fs.unlinkSync(htmlFileName)
  }

  visualizeBundles({
    bundles: `${downloadsDir}/*`,
    htmlFileName,
    downloadsDir,
    coverageFilePath
  })
}

main()
