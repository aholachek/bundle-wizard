import React from 'react'
import levenshtein from 'js-levenshtein'

export function usePrevious(value) {
  const ref = React.useRef()
  React.useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}

export function findMostLikelyPath (arr, name) {
  if (arr.length < 2) return arr[0]

  let leastDistance
  let mostProbablePath
  arr.forEach(pathName => {
    const distance = levenshtein(pathName, name)
    if (leastDistance === undefined || distance < leastDistance) {
      leastDistance = distance
      mostProbablePath = pathName
    }
  })
  return mostProbablePath
}
