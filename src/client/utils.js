import React from 'react'
import levenshtein from 'js-levenshtein'
import cloneDeep from 'lodash.clonedeep'

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

export const filterData = (data, searchStr) => {
  const regex = new RegExp(searchStr, 'i')
  const filteredData = cloneDeep(data, searchStr)
  // simply remove leaf children that don't match
  // (the id has the entire path in it so it will catch outer folder names )
  const traverse = node => {
    if (!node.children) return node
    node.children = node.children
      .filter(child => {
        if (child.children) return true
        if (regex.test(child.id)) {
          return true
        }
        return false
      })
      .map(child => {
        if (child.children) return traverse(child)
        return child
      })
    return node
  }

  traverse(filteredData)
  return filteredData
}
