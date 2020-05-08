import React from 'react'
import levenshtein from 'js-levenshtein'

export function usePrevious(value) {
  const ref = React.useRef()
  React.useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}

export function findMostLikelyPath(arr, name) {
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

// any dict with only one key should turn into a key1/key
const hasOneChild = d => d.children && d.children.length === 1

export const collapse = d => {
  if (hasOneChild(d)) {
    const onlyChild = d.children[0]
    const name = `${d.name}/${onlyChild.name}`

    Object.keys(d).forEach(key => delete d[key])
    Object.keys(onlyChild).forEach(key => {
      d[key] = onlyChild[key]
    })

    d.name = name

    collapse(d)
  }
  if (d.children) d.children.forEach(child => collapse(child))
}
