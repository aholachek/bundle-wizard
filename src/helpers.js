const fs = require('fs-extra')
const { explore } = require('source-map-explorer')
const open = require('open')
const request = require('request-promise-native')
const { MultiSelect, Toggle } = require('enquirer')

const visualizeBundles = ({
  bundles,
  visHTML,
  bundleFolderName,
  fullCoverageFilePath
}) => {
  console.log(
    `\n⏳  Generating sourcemap visualization (this might take a few minutes...)\n`
  )

  const htmlFileName = `${__dirname}/${visHTML}`

  fs.removeSync(htmlFileName)

  explore(bundles, {
    output: {
      format: 'html',
      filename: htmlFileName
    },
    coverage: fullCoverageFilePath
  })
    .then(() => {
      open(htmlFileName)
      fs.removeSync(bundleFolderName)
      console.log(
        `🎊  Done! A source map visualization should pop up in your default browser.\n`
      )
    })
    .catch(e => {
      console.error('Failed to generate source map visualization')
      console.error(e)
    })
}

const partitionUrls = urls => {
  const baseRegex = /.*\//

  const getBase = url => {
    const m = url.match(baseRegex)
    return m ? m[0] : ''
  }

  const histogram = urls.reduce((acc, curr) => {
    const base = getBase(curr)
    acc[base] = acc[base] ? acc[base].concat(curr) : [curr]
    return acc
  }, {})

  if (Object.keys(histogram).length < 2) return [urls, []]

  const mostFrequentBase = Object.entries(histogram).sort(
    (a, b) => b[1].length - a[1].length
  )[0][0]
  const fetchUrls = []
  const dontFetchUrls = []

  urls.forEach(url => {
    const m = url.match(baseRegex)
    if (m && m[0] === mostFrequentBase) return fetchUrls.push(url)

    dontFetchUrls.push(url)
  })

  return [fetchUrls, dontFetchUrls]
}

const fileNameRegex = /[^/]*\.(m)?js$/

const initDownloadFilesFlow = async ({ bundleFolderName, urlToFileDict }) => {
  const urls = Object.keys(urlToFileDict)

  const [fetchUrls, dontFetchUrls] = partitionUrls(urls)

  console.log(
    `\n🔎  sourcemap-wizard found ${fetchUrls.length +
      dontFetchUrls.length} JavaScript files. Of those, it excluded ${
      dontFetchUrls.length
    } files as likely third party scripts.\n`
  )

  const acceptAlgorithmPrompt = new Toggle({
    message: 'Would you like to manually verify these results?',
    enabled: 'Yes',
    disabled: 'No'
  })

  const manuallyCheck = await acceptAlgorithmPrompt.run()

  let files = fetchUrls

  if (manuallyCheck) {
    const prompt = new MultiSelect({
      message: '\nThe following files will be fetched and analyzed:',
      hint:
        'Press space to remove a file from the list. Press enter to proceed.\n',
      initial: fetchUrls,
      choices: fetchUrls
    })

    files = await prompt.run()

    const removedPrompt = new MultiSelect({
      message: '\nThe following files were excluded from analysis:',
      hint:
        'Press space to add a file back to the list of files to be analyzed. Press enter to proceed.\n',
      choices: dontFetchUrls,
      onSubmit() {
        // TODO: maybe leave a nicer message?
        this.emptyError = ''
      }
    })

    const addedBackFiles = await removedPrompt.run()

    if (addedBackFiles.length) {
      ;[].push.apply(files, addedBackFiles)
      addedBackFiles.forEach(file => {
        const fileIndex = dontFetchUrls.findIndex(file)
        dontFetchUrls.splice(fileIndex, 1)
      })
    }
  }

  dontFetchUrls.forEach(url => {
    // we're  using the folder contents as the new source of truth,
    // so clean up unneeded files
    fs.removeSync(urlToFileDict[url])
  })

  console.log('\n⬇️  Downloading sourcemaps...')

  const promises = files.map(url => {
    return request({
      gzip: true,
      uri: `${url}.map`
    })
      .then(response => {
        fs.writeFileSync(`${urlToFileDict[url]}.map`, response)
      })
      .catch(error => {
        console.error(`\nUnable to download sourcemap: ${url}.map\n`)
        console.error(error)
      })
  })

  await Promise.all(promises)
  return fs.readdirSync(bundleFolderName).map(file => {
    return `${bundleFolderName}/${file}`
  })
}

const createListOfLocalPaths = ({ files, path }) => {
  const fileNames = files
    .map(file => {
      const match = file.match(fileNameRegex)
      if (match) return match[0]
      return false
    })
    .filter(Boolean)
  const filesWithSourcemaps = fileNames
    .map(fileName => `${path}/${fileName}`)
    .filter(file => {
      const hasSourcemap = fs.existsSync(`${file}.map`)
      return hasSourcemap
    })
  return filesWithSourcemaps.concat(filesWithSourcemaps.map(f => `${f}.map`))
}

// only relevant when bundles are provided
const jsURLsFromCoverage = coverage => {
  const urls = coverage
    // TODO: refine this logic
    .filter(c => /(m)?js$/.test(c.url))
    .filter(c => !/^file:/.test(c.url))
    .map(c => c.url)
  return urls
}

module.exports = {
  createListOfLocalPaths,
  visualizeBundles,
  initDownloadFilesFlow,
  partitionUrls,
  jsURLsFromCoverage
}
