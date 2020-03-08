const calculateCoverage = (totalLength, ranges) => {
  return (
    ranges.reduce((acc, curr) => {
      const range = curr.end - curr.start
      return acc + range
    }, 0) / totalLength
  )
}

module.exports = calculateCoverage
