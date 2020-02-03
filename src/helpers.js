const fs = require('fs-extra')
const { explore } = require('source-map-explorer')
const open = require('open')
const request = require('request-promise-native')

const visualizeBundles = ({
  bundles,
  htmlFileName,
  bundleFolderName,
  coverageFilePath
}) => {
  console.log(
    `\n⏳  Generating sourcemap visualization (this might take a few minutes...)\n`
  )

  explore(bundles, {
    output: {
      format: 'html',
      filename: htmlFileName
    },
    coverage: coverageFilePath
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

const fileNameRegex = /[^/]*\.(m)?js$/

const downloadSourcemaps = async ({ urlToFileDict }) => {
  const urls = Object.keys(urlToFileDict)

  console.log('\n⬇️  Downloading sourcemaps...')

  const promises = urls.map(url => {
    return request({
      gzip: true,
      uri: `${url}.map`
    })
      .then(response => {
        fs.writeFileSync(`${urlToFileDict[url]}.map`, response)
      })
      .catch(error => {
        fs.removeSync(urlToFileDict[url])
        console.error(`\nUnable to download sourcemap: ${url}.map\n`)
      })
  })

  await Promise.all(promises)
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

const delay = t => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, t)
  })
}

module.exports = {
  createListOfLocalPaths,
  visualizeBundles,
  downloadSourcemaps,
  jsURLsFromCoverage,
  delay
}
