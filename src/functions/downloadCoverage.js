const puppeteerCore = require('puppeteer-core')
const chromeLauncher = require('chrome-launcher')
const fs = require('fs')
const { Input, Confirm } = require('enquirer')
const delay = require('./delay')
const { splitString } = require('./utils')
const util = require('util')
const request = require('request')

const validateURL = url => {
  if (!/^http/.test(url)) {
    const isLocalhostHack =
      url.includes('localhost') || url.includes('127.0.0.1')
    if (isLocalhostHack) url = `http://${url}`
    else url = `https://${url}`
    return url
  }
  try {
    new URL(url)
    return url
  } catch (e) {
    console.error(
      `⚠️  The provided url: ${url} is not valid, please try again.`
    )
    return false
  }
}

const promptForURL = async () => {
  const url = await new Input({
    message: `Which site would you like to analyze?`,
    initial: 'https://reactjs.org/'
  }).run()

  const validUrl = validateURL(url)
  if (validUrl) {
    return validUrl
  } else {
    process.exit(9)
  }
}

const downloadCoverage = async ({
  url,
  ignoreHTTPSErrors,
  type,
  interact,
  downloadsDir,
  coverageFilePath,
  tempFolderName
}) => {
  if (!url) {
    url = await promptForURL()
    console.log('\n')
  } else {
    url = validateURL(url)
  }

  console.log(`🤖  Loading ${url} ...\n`)

  const isMobile = type === 'mobile'

  let browser
  let chrome

  if (interact) {
    const puppeteer = require('puppeteer')

    browser = await puppeteer.launch({
      headless: false,
      ignoreHTTPSErrors
    })
  } else {
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless'],
      output: 'json'
    })

    const resp = await util.promisify(request)(
      `http://localhost:${chrome.port}/json/version`
    )
    const { webSocketDebuggerUrl } = JSON.parse(resp.body)
    browser = await puppeteerCore.connect({
      browserWSEndpoint: webSocketDebuggerUrl,
      ignoreHTTPSErrors
    })
  }

  const page = (await browser.pages())[0]

  if (isMobile) {
    await page.emulate(puppeteerCore.devices['iPhone X'])
  }

  const urlToFileDict = {}

  page.on('response', response => {
    const status = response.status()
    if (status >= 300 && status <= 399) {
      return
    }
    const url = new URL(response.url())
    const fileName = url.pathname.split('/').slice(-1)[0]
    const isJSFile = fileName.match(/\.(m)?js(on)?$/)
    if (!isJSFile) return
    response.text().then(body => {
      const localFileName = `${downloadsDir}/${Math.random()}${splitString}${fileName}`
      urlToFileDict[url.toString()] = localFileName
      fs.writeFileSync(localFileName, body)
    })
  })

  const startTrace = async () => {
    await page.tracing.start({
      path: `${tempFolderName}/trace.json`
    })
    // TODO: try block level
    await page.coverage.startJSCoverage()
  }

  let interactionUrl

  if (interact) {
    await page.goto(url)

    console.log('\n💻  A browser window just opened.\n')
    const startPrompt = new Confirm({
      name: 'question',
      message:
        'Type "y" to reload the current page and begin recording performance data'
    })
    await startPrompt.run()
    await startTrace()
    interactionUrl = page.url()
    await page.reload()
    console.log('\n🐢  Finishing up loading...')
  } else {
    await startTrace()
    await page.goto(url)
    console.log('🐢  Finishing up loading...')
  }
  // allow for any extra requests to complete
  await delay(4000)

  await page.screenshot({ path: `${tempFolderName}/screenshot.png` })

  console.log('\n📋  Writing coverage file to disk...')
  const tracing = await page.tracing.stop()
  const jsCoverage = await page.coverage.stopJSCoverage()
  // prevent bug that was crashing source-map-explorer for certain sites
  const validJSCoverageLines = jsCoverage.filter(({ url }) => {
    try {
      new URL(url)
      return true
    } catch (e) {
      return false
    }
  })
  fs.writeFileSync(coverageFilePath, JSON.stringify(validJSCoverageLines))

  try {
    await browser.close()
    if (chrome) await chrome.kill()
  } catch (error) {
    console.error(error)
    // merged as a fix by https://github.com/aholachek/bundle-wizard/pull/6
  }
  return { urlToFileDict, url: interactionUrl || url, tracing }
}

module.exports = downloadCoverage
