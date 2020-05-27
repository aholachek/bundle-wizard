const splitString = '@%&@%&'

const pause = delay => {
  return new Promise(resolve => {
    setTimeout(resolve, delay)
  })
}

module.exports = {
  splitString,
  pause
}
