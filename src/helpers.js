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
    `\n⏳  Generating sourcemap visualization (this might take several minutes...)\n`
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

const jsURLsFromCoverage = coverage => {
  const urls = coverage
    // TODO: refine this logic
    .filter(c => /(m)?js$/.test(c.url))
    .filter(c => !/^file:/.test(c.url))
    .map(c => c.url)
  return urls
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

const initDownloadFilesFlow = async ({ bundleFolderName, coverage }) => {
  const urls = jsURLsFromCoverage(coverage)

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
    }
  }

  console.log('\n⬇️  Downloading bundles...')

  const dir = bundleFolderName

  fs.removeSync(dir)
  fs.mkdirSync(dir)

  const promises = []

  files.forEach(url => {
    let fileName
    try {
      fileName = url.match(fileNameRegex)[0]
    } catch (e) {}

    const filePromise = request({
      gzip: true,
      uri: url
    })
      .then(response => {
        fs.writeFileSync(`${bundleFolderName}/${fileName}`, response)
        return url
      })
      .catch(error => {
        console.error(`\nUnable to download: ${url}\n`)
        console.error(error)
      })

    const sourceMapPromise = request({
      gzip: true,
      uri: `${url}.map`
    })
      .then(response => {
        fs.writeFileSync(`${bundleFolderName}/${fileName}.map`, response)
      })
      .catch(error => {
        console.error(`\nUnable to download: ${url}.map\n`)
      })

    ;[].push.apply(promises, [filePromise, sourceMapPromise])
  })

  return Promise.all(promises).catch(e => {
    console.error('Downloading bundles and sourcemaps failed')
    console.error(e)
  })
}

const fileNameRegex = /[^/]*\.(m)?js$/

const createListOfLocalPaths = ({ files, path }) => {
  const fileNames = files
    // filter out resolved promises for sourcemaps
    .filter(Boolean)
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

module.exports = {
  createListOfLocalPaths,
  visualizeBundles,
  initDownloadFilesFlow,
  jsURLsFromCoverage,
  partitionUrls
}
