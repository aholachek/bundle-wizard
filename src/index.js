#!/usr/bin/env node

const fs = require('fs-extra')
const argv = require('yargs').argv
const downloadCoverage = require('./download-coverage')

const { visualizeBundles, downloadSourcemaps } = require('./helpers')

const bundleFolderName = `${__dirname}/../sourcemap-wizard-downloads`

const dir = bundleFolderName

fs.removeSync(dir)
fs.mkdirSync(dir)

const main = async () => {
  console.log(`\n 🧙‍  Welcome to sourcemap-wizard\n`)

  let coverageFilePath, urlToFileDict, url

  if (argv.type && !['mobile', 'desktop'].includes(argv.type)) {
    console.error(
      `❌  type argument not recognized. Please pass in either "mobile" or "desktop".\n`
    )
    process.exit()
  }

  if (argv.debug) global.debug = true

  try {
    const downloadedData = await downloadCoverage({
      url: (argv._ && argv._[0]) || argv.url,
      type: argv.type,
      bundleFolderName
    })
    coverageFilePath = downloadedData.coverageFilePath
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
    bundleFolderName,
    urlToFileDict
  })

  const visHTML = `${url.replace('https://', '')}-sourcemap-analysis.html`
  const htmlFileName = `${__dirname}/../${visHTML}`

  if (fs.existsSync(htmlFileName)) {
    fs.unlinkSync(htmlFileName)
  }

  visualizeBundles({
    bundles: `${bundleFolderName}/*`,
    htmlFileName,
    bundleFolderName,
    coverageFilePath
  })
}

main()
