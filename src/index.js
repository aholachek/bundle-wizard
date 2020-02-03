#!/usr/bin/env node

const fs = require('fs-extra')
const argv = require('yargs').argv
const path = require('path')
const downloadCoverage = require('./download-coverage')

const {
  visualizeBundles,
  initDownloadFilesFlow,
  createListOfLocalPaths,
  jsURLsFromCoverage
} = require('./helpers')
const process = require('process')

const visHTML = 'bundles.html'

if (fs.existsSync(visHTML)) {
  fs.urnlinkSync(visHTML)
}

const createFullPath = pathArg =>
  path.isAbsolute(pathArg) ? pathArg : `${process.cwd()}/${pathArg}`

const bundleFolderName = `${__dirname}/sourcemap-wizard-downloads`

const dir = bundleFolderName

fs.removeSync(dir)
fs.mkdirSync(dir)

const main = async () => {
  console.log(`\n 🧙‍  Welcome to sourcemap-wizard\n`)

  const { coverageFilePath, urlToFileDict } = await downloadCoverage({
    url: (argv._ && argv._[0]) || argv.url,
    bundleFolderName
  })

  const fullCoverageFilePath = coverageFilePath
    ? coverageFilePath
    : createFullPath(argv.coverage)

  const coverageFileStats = fs.statSync(fullCoverageFilePath)

  if (coverageFileStats['size'] === 0) {
    console.error(
      '❌  The coverage file is empty. Please try again with a new file.'
    )
    return
  }

  const coverage = require(fullCoverageFilePath)

  if (argv.bundles) {
    const urls = jsURLsFromCoverage(coverage)
    const paths = createListOfLocalPaths({
      files: urls,
      path: argv.bundles
    })
    visualizeBundles({
      bundles: paths,
      visHTML,
      bundleFolderName,
      fullCoverageFilePath
    })
  } else {
    const paths = await initDownloadFilesFlow({
      bundleFolderName,
      urlToFileDict
    })

    visualizeBundles({
      bundles: paths,
      visHTML,
      bundleFolderName,
      fullCoverageFilePath
    })
  }
}

main()
