const puppeteer = require('puppeteer')
const { devicesMap } = require('puppeteer/DeviceDescriptors')
const fs = require('fs')
const { Input, Confirm } = require('enquirer')
const delay = require('./delay')
const { splitString } = require('./utils')

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

  const browser = await puppeteer.launch({ headless: !interact, ignoreHTTPSErrors })
  const page = (await browser.pages())[0]

  if (isMobile) {
    await page.emulate(devicesMap['iPhone X'])
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

    console.log(
      '\n💻  A browser window that you can interact with just opened.\n'
    )
    const startPrompt = new Confirm({
      name: 'question',
      message:
        'Type "y" to reload the current page and begin recording performance data'
    })
    await startPrompt.run()
    await startTrace()
    interactionUrl = page.url()
    await page.reload()
  } else {
    await startTrace()
    await page.goto(url)
  }

  console.log('🐢  Finishing up loading...')
  await delay(4000)

  await page.screenshot({ path: `${tempFolderName}/screenshot.png` })

  console.log('\n📋  Writing coverage file to disk...')
  const tracing = await page.tracing.stop()
  const jsCoverage = await page.coverage.stopJSCoverage()
  fs.writeFileSync(coverageFilePath, JSON.stringify(jsCoverage))

  try {
    await browser.close()
  } catch (error) {
    // merged as a fix by https://github.com/aholachek/bundle-wizard/pull/6
  }
  return { urlToFileDict, url: interactionUrl || url, tracing }
}

module.exports = downloadCoverage
