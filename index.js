#!/usr/bin/env node

const fs = require('fs-extra')
const inquirer = require('inquirer')
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

const bundleFolderName = `${__dirname}/sourcemap-wizard-downloads`

const shouldDownload = 'Download the js bundles and sourcemaps for me'
const shouldNotDownload = 'I already have the js bundles and sourcemaps'

const defaultBundlesPath = `${process.cwd()}/build/static/js`

coverageAndDownloadPrompts({ shouldDownload, shouldNotDownload }).then(
  answers => {
    const coverage = require(`${process.cwd()}/${answers.coverage}`)
    if (answers.download === shouldNotDownload) {
      inquirer
        .prompt([
          {
            type: 'fuzzypath',
            itemType: 'directory',
            message: 'Provide the directory path to the bundles and sourcemaps',
            excludePath: nodePath => nodePath.startsWith('node_modules'),
            default: fs.existsSync(defaultBundlesPath)
              ? defaultBundlesPath
              : undefined,
            name: 'path'
          }
        ])
        .then(answers => {
          const urls = jsURLsFromCoverage(coverage)
          const paths = createListOfLocalPaths({
            files: urls,
            path: answers.path
          })
          visualizeBundles({
            bundles: paths,
            visHTML,
            bundleFolderName,
            coverageFilePath: answers.coverage
          })
        })
    } else {
      initDownloadFilesFlow({
        coverage,
        bundleFolderName,
        coverageFilePath: answers.coverage
      }).then(fetchedFileNames => {
        const paths = createListOfLocalPaths({
          files: fetchedFileNames,
          path: bundleFolderName
        })
        visualizeBundles({
          bundles: paths,
          visHTML,
          bundleFolderName,
          coverageFilePath: answers.coverage
        })
      })
    }
  }
)
