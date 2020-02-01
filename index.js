#!/usr/bin/env node

const fs = require('fs-extra')
const inquirer = require('inquirer')
const argv = require('yargs').argv
const path = require('path')

const {
  visualizeBundles,
  initDownloadFilesFlow,
  createListOfLocalPaths,
  coverageAndDownloadPrompts,
  jsURLsFromCoverage
} = require('./helpers')
const process = require('process')

inquirer.registerPrompt('fuzzypath', require('inquirer-fuzzy-path'))

const visHTML = 'bundles.html'

if (fs.existsSync(visHTML)) {
  fs.unlinkSync(visHTML)
}

const createFullPath = pathArg =>
  path.isAbsolute(pathArg) ? pathArg : `${process.cwd()}/${pathArg}`

const bundleFolderName = `${__dirname}/sourcemap-wizard-downloads`

const shouldDownload = 'Download the js bundles and sourcemaps for me'
const shouldNotDownload = 'I already have the js bundles and sourcemaps'

const defaultBundlesPath = `${process.cwd()}/build/static/js`

coverageAndDownloadPrompts({
  shouldDownload,
  shouldNotDownload,
  argv
}).then(answers => {
  const coverageFilePath = answers.coverage
    ? `${process.cwd()}/${answers.coverage}`
    : createFullPath(argv.coverage)

  const coverageFileStats = fs.statSync(coverageFilePath)

  if (coverageFileStats['size'] === 0) {
    console.error('❌  The provided coverage file is empty. Please try again with a new file.')
    return
  }

  const coverage = require(coverageFilePath)

  if (answers.download === shouldNotDownload || argv.bundles) {
    inquirer
      .prompt(
        [
          !argv.bundles && {
            type: 'fuzzypath',
            itemType: 'directory',
            message: 'Provide the directory path to the bundles and sourcemaps',
            excludePath: nodePath => {
              const hiddenFolderRegex = /^\.(.)+/
              return (
                nodePath.startsWith('node_modules') ||
                hiddenFolderRegex.test(nodePath)
              )
            },
            default: fs.existsSync(defaultBundlesPath)
              ? defaultBundlesPath
              : undefined,
            name: 'path'
          }
        ].filter(Boolean)
      )
      .then(answers => {
        const urls = jsURLsFromCoverage(coverage)
        const paths = createListOfLocalPaths({
          files: urls,
          path: answers.path || argv.bundles
        })
        visualizeBundles({
          bundles: paths,
          visHTML,
          bundleFolderName,
          coverageFilePath
        })
      })
  } else {
    initDownloadFilesFlow({
      coverage,
      bundleFolderName,
      coverage
    }).then(fetchedFileNames => {
      const paths = createListOfLocalPaths({
        files: fetchedFileNames,
        path: bundleFolderName
      })
      visualizeBundles({
        bundles: paths,
        visHTML,
        bundleFolderName,
        coverageFilePath
      })
    })
  }
})
