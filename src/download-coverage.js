const chromeLauncher = require('chrome-launcher')
const puppeteer = require('puppeteer-core')
const devices = require('puppeteer-core/DeviceDescriptors')
const request = require('request')
const util = require('util')
const fs = require('fs')
const { Input, Select, Confirm } = require('enquirer')
const { delay } = require('./helpers')

const launchBrowser = async ({ interact }) => {
  const opts = {
    chromeFlags: interact ? undefined : ['--headless'],
    logLevel: global.debug ? 'info' : 'error',
    output: 'json'
  }
  try {
    const chrome = await chromeLauncher.launch(opts)
    opts.port = chrome.port

    const resp = await util.promisify(request)(
      `http://localhost:${opts.port}/json/version`
    )
    const { webSocketDebuggerUrl } = JSON.parse(resp.body)
    const browser = await puppeteer.connect({
      browserWSEndpoint: webSocketDebuggerUrl
    })
    return [chrome, browser]
  } catch (e) {
    console.error('❌  Unable to launch Chrome:\n')
    console.error(e)
    process.exit(1)
  }
}

const validateURL = url => {
  if (!/^http/.test(url)) {
    url = `https://${url}`
    return url
  }
  try {
    new URL(url)
    return url
  } catch (e) {
    console.error(
      `❌  The provided url: ${url} is not valid, please try again.`
    )
    return false
  }
}

const promptForURL = async () => {
  const url = await new Input({
    message: `Which site would you like to analyze?`,
    initial: 'https://reddit.com'
  }).run()

  const validUrl = validateURL(url)
  if (validUrl) {
    return validUrl
  } else {
    process.exit(9)
  }
}

const mobile = '📱  mobile'
const desktop = '🖥️  desktop'

const promptForUserAgent = async siteName => {
  const prompt = new Select({
    message: `Do you want to analyze the mobile or desktop version of ${siteName}?`,
    choices: [mobile, desktop],
    initial: 'mobile'
  })
  const userAgent = await prompt.run()
  return userAgent
}

const promptForInteraction = async () => {
  console.log(
    'A browser window should have opened that you can interact with.\n'
  )

  const prompt = new Input({
    message: `Press enter to close the browser and continue`,
    initial: '',
    default: ''
  })
  await prompt.run()
}

const downloadCoverage = async ({
  url,
  type,
  interact,
  downloadsDir,
  coverageFilePath
}) => {
  if (!url) {
    url = await promptForURL()
  } else {
    url = validateURL(url)
  }
  if (!type) {
    type = await promptForUserAgent(url)
  }

  console.log(`\n🤖  Recording page load info for ${url} ...`)

  const [chrome, browser] = await launchBrowser({ interact })

  const page = await browser.newPage()

  const isMobile = type === mobile

  if (isMobile) {
    await page.emulate(devices['iPhone X'])
  }

  const urlToFileDict = {}

  page.on('response', response => {
    const url = new URL(response.url())
    const fileName = url.pathname.split('/').slice(-1)[0]
    const isJSFile = fileName.match(/\.(m)?js$/)
    if (!isJSFile) return
    response.text().then(body => {
      const localFileName = `${downloadsDir}/${fileName}`
      urlToFileDict[url.toString()] = localFileName
      fs.writeFileSync(localFileName, body)
    })
  })

  await page.coverage.startJSCoverage()
  await page.goto(url)

  if (interact) {
    await promptForInteraction()
  } else {
    console.log('\n🤖  Finishing up recording...\n')
    await delay(5000)
  }

  console.log('🤖  Writing coverage file to disk...')

  const jsCoverage = await page.coverage.stopJSCoverage()
  fs.writeFileSync(coverageFilePath, JSON.stringify(jsCoverage))

  await browser.disconnect()
  await browser.close()
  await chrome.kill()

  return { urlToFileDict, url }
}

module.exports = downloadCoverage
