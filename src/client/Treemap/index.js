import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import throttle from 'lodash.throttle'
import cloneDeep from 'lodash.clonedeep'

const color = d3.scaleSequential([-0.2, 1.15], d3.interpolateRdYlGn)

const isTopLevel = d => d && d.data && d.data.name === 'topLevel'

// adjust based on whether we are showing scripts without
// sourcemaps
const editTopLevelData = (filteredData, childArray) => {
  const realSize = childArray.reduce((acc, curr) => {
    return acc + curr.realSize
  }, 0)
  const originalChildCount = childArray.length
  const averageCoverage =
    childArray
      .filter(child => typeof child.averageCoverage === 'number')
      .reduce((acc, curr) => {
        return acc + curr.averageCoverage
      }, 0) / childArray.length

  return {
    ...filteredData,
    realSize,
    originalChildCount,
    averageCoverage,
    children: childArray
  }
}

const removeTooSmallNodes = (data, ids) => {
  const idDict = ids.reduce((acc, curr) => {
    acc[curr] = true
    return acc
  }, {})

  const traverseTree = node => {
    if (node.children) {
      const originalChildCount = node.children.length

      const filteredChildren = node.children.filter(child => {
        return idDict[child.id]
      })

      let removedSize = 0

      const traverseSize = node => {
        if (node.size) removedSize += node.size
        else if (node.children) node.children.forEach(traverseSize)
      }

      const removedNodes = node.children.filter(child => !idDict[child.id])
      removedNodes.forEach(traverseSize)

      const additionalFraction = removedSize / filteredChildren.length

      filteredChildren.forEach(node => {
        const leafChildren = []

        const traverse = node => {
          if (!node.children) {
            leafChildren.push(node)
            return
          }
          node.children.forEach(node => {
            if (!node.children || !node.children.length) leafChildren.push(node)
            else traverse(node)
          })
        }
        traverse(node)

        leafChildren.forEach(
          leaf => (leaf.size += additionalFraction / leafChildren.length)
        )
      })

      node.children = filteredChildren
      node.originalChildCount = originalChildCount

      node.children.forEach(traverseTree)
    }
  }
  traverseTree(data)
  return data
}

// any dict with only one key should turn into a key1/key
const hasOneChild = d => d.children && d.children.length === 1

const collapse = d => {
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

const renderGraph = ({
  el,
  data,
  setGraphRoot,
  width,
  height,
  setHovered,
  showScriptsWithoutSourcemaps
}) => {
  const container = d3.select(el)

  const isFirstRender = el.childElementCount > 0

  if (!isFirstRender) {
    el.classList.add('box-transition-position')
  }

  const treemap = (data, noPadding) => {
    return d3
      .treemap()
      .size([width, height])
      .paddingOuter(noPadding ? 0 : 10)
      .paddingTop(noPadding ? 0 : 24)
      .paddingInner(noPadding ? 0 : 4)
      .round(false)(
      d3
        .hierarchy(data)
        .sum(d => d.size)
        .sort((a, b) => b.value - a.value)
    )
  }

  const dataCopy = cloneDeep(data)

  const testRoot = treemap(dataCopy, true)

  const filterData = node => {
    if (!node.children) return
    const parentArea = (node.y1 - node.y0) * (node.x1 - node.x0)

    const maxChildren = Math.ceil(parentArea / 10000)

    const filteredChildArray = node.children
      .sort((a, b) => b.value - a.value)
      .slice(0, maxChildren)

    node.children = filteredChildArray
    node.children.forEach(c => filterData(c))
  }

  filterData(testRoot)

  const allowedIds = testRoot.descendants().map(node => node.data.id)
  collapse(dataCopy)
  const filteredData = removeTooSmallNodes(dataCopy, allowedIds)

  const editedFilteredData =
    filteredData.name !== 'topLevel'
      ? filteredData
      : showScriptsWithoutSourcemaps
      ? editTopLevelData(filteredData, filteredData.children)
      : editTopLevelData(
          filteredData,
          filteredData.children
            ? filteredData.children.filter(c => !c.noSourcemap)
            : []
        )

  const root = treemap(editedFilteredData)

  const renderBoxShadowBorder = d => {
    if (isTopLevel(d)) return 'white'

    if (d.parent && isTopLevel(d.parent)) {
      return '0 0 0 1px #000'
    }
    if (typeof d.data.averageCoverage !== 'number') return '0 0 0 1px #a8a8a8'
    const background = color(d.data.averageCoverage)
    const borderColor = d3.hsl(background).darker(1)
    return `0 0 0 1px ${borderColor}`
  }

  const createSizeLabel = d => `${Math.ceil(d.data.realSize / 1000)}kb`

  const createEnteredElements = enter => {
    const entered = enter
      .filter(function(d) {
        const width = d.x1 - d.x0
        const height = d.y1 - d.y0
        return width > 3 && height > 3 && width * height > 50
      })
      .append('div')
      .style('background-color', d => {
        if (typeof d.data.averageCoverage !== 'number') return 'white'
        if (isTopLevel(d)) return 'white'
        return color(d.data.averageCoverage)
      })
      .style('box-shadow', renderBoxShadowBorder)
      .on('click', d => {
        setGraphRoot(d.data.id)
      })
      .on('mouseenter', function(d) {
        setHovered(d)
        if (isTopLevel(d)) return
        const isBundle = d.parent && isTopLevel(d.parent.data)

        if (isBundle)
          return (this.style.boxShadow = `0 0 0 1px #000${
            d.parent ? `, 0 5px 15px hsla(0, 0%, 0%, 0.7)` : ''
          }`)

        if (typeof d.data.averageCoverage !== 'number')
          return (this.style.boxShadow = `0 0 0 1px #a8a8a8${
            d.parent ? `, 0 5px 15px hsla(0, 0%, 0%, 0.5)` : ''
          }`)

        const background = color(d.data.averageCoverage)
        const borderColor = d3.hsl(background).darker(1)
        const shadowColor = d3.hsl(background).darker(2)
        this.style.boxShadow = `0 0 0 1px ${borderColor}${
          d.parent ? `, 0 5px 15px ${shadowColor}` : ''
        }`
      })
      .on('mouseleave', function(d) {
        setHovered(null)
        this.style.boxShadow = renderBoxShadowBorder(d)
      })
      .classed(`box ${isFirstRender ? 'animate-in-box' : ''}`, true)
      .style('z-index', d => {
        return d.depth
      })
      .style('width', d => {
        const width = d.x1 - d.x0
        return `${width}px`
      })
      .style('height', d => {
        const height = d.y1 - d.y0
        return `${height}px`
      })
      .style('top', d => `${d.y0}px`)
      .style('left', d => `${d.x0}px`)
      .classed('no-interact', d => {
        return !d.parent
      })

    const label = entered
      .append('div')
      .attr('class', 'label')

      .text(d => {
        if (isTopLevel(d)) return 'all bundles'
        return d.data.name
      })

    label
      .append('div')
      .attr('data-size', true)
      .text(createSizeLabel)

    return entered
  }

  const animateUpdate = selection => {
    if (selection.size() === 0) return

    const startAnimation = () => {
      selection
        .classed('no-interact', d => {
          return !d.parent
        })
        .style('z-index', d => {
          return d.depth
        })
        .style('width', d => {
          const width = d.x1 - d.x0
          return `${width}px`
        })
        .style('height', d => {
          const height = d.y1 - d.y0
          return `${height}px`
        })
        .style('top', d => `${d.y0}px`)
        .style('left', d => `${d.x0}px`)
        .style('box-shadow', renderBoxShadowBorder)
        .each(function(d) {
          this.querySelector('[data-size]').innerText = createSizeLabel(d)
        })
    }
    startAnimation()
  }

  container
    .selectAll('div.box')
    .data(root.descendants(), d => {
      if (!d) return ''
      return d.data.id
    })
    .join(createEnteredElements, animateUpdate, exit => {
      exit.classed('animate-out-box', true)
      setTimeout(() => {
        exit.remove()
      }, 300)
    })
}

const Treemap = ({
  data,
  setGraphRoot,
  setHovered,
  showScriptsWithoutSourcemaps
}) => {
  const graphContainerRef = React.useRef(null)
  const dimensionsRef = useRef({})
  const cacheWindowSize = () => {
    dimensionsRef.current.width = window.innerWidth
    dimensionsRef.current.height = document.body.clientHeight - 100
  }
  useEffect(() => {
    const throttledResize = throttle(() => {
      cacheWindowSize()

      renderGraph({
        el: graphContainerRef.current,
        data,
        setGraphRoot,
        setHovered,
        showScriptsWithoutSourcemaps,
        ...dimensionsRef.current
      })
    }, 250)
    window.addEventListener('resize', throttledResize)
    return () => {
      window.removeEventListener('resize', throttledResize)
    }
  }, [])

  useEffect(() => {
    cacheWindowSize()
    renderGraph({
      el: graphContainerRef.current,
      data,
      setGraphRoot,
      setHovered,
      ...dimensionsRef.current,
      showScriptsWithoutSourcemaps
    })
  }, [data.id, showScriptsWithoutSourcemaps])

  return <div ref={graphContainerRef} className="treemap"></div>
}

export default React.memo(Treemap)
