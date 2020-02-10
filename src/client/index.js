import 'sanitize.css'
import './index.scss'
import _sourcemapAnalysis from './sourcemap-analysis.json'
import * as d3 from 'd3'

const sourcemapAnalysis = _sourcemapAnalysis.results

const findeOrCreateChild = (arr, name) => {
  const child = arr.find(child => child.name === name)
  if (!child) {
    const newChild = {}
    newChild.name = name
    arr.push(newChild)
    return newChild
  }
  return child
}
const processFiles = files => {
  const fileChildren = []
  Object.keys(files).forEach(file => {
    const parts = file.split(/\//g).filter(f => {
      return f && !f.match('webpack:')
    })
    let childrenReference = fileChildren
    parts.forEach((part, i, arr) => {
      const child = findeOrCreateChild(childrenReference, part)
      if (i === arr.length - 1) {
        Object.assign(child, files[file])
      } else {
        child.children = child.children || []
        childrenReference = child.children
      }
    })
  })

  // any dict with only one key should turn into a key1/key2

  const hasOneChild = d => {
    return (
      d.children &&
      d.children.length === 1 &&
      (!d.children[0].children || d.children[0].children.length === 1)
    )
  }

  const collapse = d => {
    if (hasOneChild(d)) {
      const onlyChild = d.children[0]
      d.name = `${d.name}/${onlyChild.name}`
      const keys = ['children', 'size', 'coveredSize']
      keys.forEach(key => {
        d[key] = onlyChild[key]
      })
      collapse(d)
    } else if (d.children) d.children.forEach(child => collapse(child))
  }
  fileChildren.forEach(child => collapse(child))
  return fileChildren
}

const processBundle = bundle => {
  return {
    name: bundle.bundleName.split(/\//g).slice(-1)[0],
    children: processFiles(bundle.files)
  }
}

const calculateAverageCoverage = data => {
  if (data.coveredSize) {
    const averageCoverage = data.coveredSize / data.size
    return averageCoverage
  }
  if (data.children && data.children.length) {
    const averages = data.children.map(child => {
      if (!child.averageCoverage)
        child.averageCoverage = calculateAverageCoverage(child)
      return child.averageCoverage
    })
    let skipCount = 0
    const average =
      averages.reduce((acc, curr) => {
        if (isNaN(curr)) {
          skipCount += 1
          return acc
        }
        return acc + curr
      }, 0) /
      (data.children.length - skipCount)

    data.averageCoverage = average
    return average
  }
}

const processData = data => {
  const processed = { name: '', children: data.map(processBundle) }
  calculateAverageCoverage(processed)
  return processed
}

const width = document.body.clientWidth - 64
const height = document.body.clientHeight - 64

const color = d3.scaleSequential([-0.1, 1.1], d3.interpolateRdYlGn)

const treemap = data =>
  d3
    .treemap()
    .tile(d3.treemapBinary)
    .size([width, height])
    .paddingOuter(10)
    .paddingTop(22)
    .paddingInner(4)
    .round(false)(
    d3
      .hierarchy(data)
      .sum(d => d.size)
      .sort((a, b) => b.value - a.value)
  )

const container = d3.select('#container')

const parentIsNodeModules = d => {
  let parent = d.parent
  let level = 1
  while (true) {
    if (!parent) break
    if (parent.data.name === 'node_modules') return level
    parent = parent.parent
    level += 1
  }
  return false
}

const renderGraph = data => {
  const root = treemap(processData(data))

  const nestedData = d3
    .nest()
    .key(d => d.height)
    .entries(root.descendants())

  const node = container
    .selectAll('div')
    .data(nestedData)
    .join('div')
    .selectAll('div')
    .data(d => d.values)

    .join('div')
    .style('transform', d => `translate(${d.x0}px,${d.y0}px)`)
    .style('z-index', d => {
      return d.depth
    })
    .attr('class', 'box')

    // dont show top level
    .filter(d => {
      if (d.data.name === '') return false
      return true
    })
    // dont show rects with height = 1 or width = 1
    .filter(d => {
      const width = d.x1 - d.x0
      const height = d.y1 - d.y0
      return width > 3 && height > 3
    })
    // dont show detail inside top level node_modules
    .filter(d => {
      return parentIsNodeModules(d) < 2
    })
    .attr('class', 'visible-box')
    .style('background-color', d => {
      return color(d.data.averageCoverage) || 'white'
    })
    .style('overflow', 'hidden')
    .style('width', d => d.x1 - d.x0)
    .style('height', d => d.y1 - d.y0)

    .append('span')
    .attr('class', d => {
      if (!d.data.children || !d.data.children.length) return `leaf leaf-label`
      return 'label'
    })
    .html(d => {
      const name = d.data.name
      const isLeaf =
        !d.data.children ||
        !d.data.children.length ||
        parentIsNodeModules(d) == 1
      const leafName = name.split('/').join('/<br/>')

      const coveragePercent =
        d.data.averageCoverage !== undefined
          ? `${Math.floor(d.data.averageCoverage.toFixed(2) * 100)}%`
          : 'N/A'

      if (isLeaf)
        return `<div>${leafName}</div> ${Math.ceil(
          d.value / 1000
        )}kb ${coveragePercent}`

      return `${name} ${Math.ceil(d.value / 1000)}kb ${coveragePercent}`
    })

  node.append('title').text(d => {
    return `${d
      .ancestors()
      .reverse()
      .map(d => d.data.name)
      .join('/')}\n${d.data.value}`
  })
}

renderGraph(sourcemapAnalysis)
