const chromeLauncher = require('chrome-launcher')
const puppeteer = require('puppeteer-core')
const devices = require('puppeteer-core/DeviceDescriptors')
const request = require('request')
const util = require('util')
const fs = require('fs')
const { Input, Select } = require('enquirer')

const defaultCoveragePath = `${__dirname}/coverage.json`

const launchBrowser = async () => {
  const opts = {
    chromeFlags: ['--headless'],
    logLevel: 'info',
    output: 'json'
  }
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
    console.error('❌  The provided url is not valid, please try again.')
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

const downloadCoverage = async url => {
  if (!url) {
    url = await promptForURL()
  }

  const userAgent = await promptForUserAgent(url)

  console.log(`\n🤖  Fetching code coverage information for ${url} ...\n`)

  const [chrome, browser] = await launchBrowser()

  const page = await browser.newPage()

  if (userAgent === mobile) {
    await page.emulate(devices['iPhone X'])
  }

  await page.coverage.startJSCoverage()
  await page.goto(url)
  const jsCoverage = await page.coverage.stopJSCoverage()

  fs.writeFileSync(defaultCoveragePath, JSON.stringify(jsCoverage))

  browser.disconnect()
  await chrome.kill()

  return defaultCoveragePath
}

module.exports = downloadCoverage
