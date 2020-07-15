const fs = require('fs-extra')
const splitString = '@%&@%&'

//github.com/sindresorhus/is-absolute-url/blob/master/index.js
const isAbsoluteUrl = url => {
  if (/^[a-zA-Z]:\\/.test(url)) return false
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)
}

const getSourcemapUrl = (textLocation, url) => {
  const defaultSourcemapUrl = `${url}.map`
  let text, match
  try {
    text = fs.readFileSync(textLocation, 'utf8')
    match = text.match(/sourceMappingURL=(.+)/)
  } catch (e) {
    return defaultSourcemapUrl
  }
  if (!match) return defaultSourcemapUrl
  const parsedUrl = match[1]
  if (isAbsoluteUrl(parsedUrl)) return parsedUrl
  // TODO: should this create a relative url from 
  return defaultSourcemapUrl
}

module.exports = {
  splitString,
  getSourcemapUrl
}
