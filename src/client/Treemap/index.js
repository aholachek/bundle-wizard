import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3/dist/d3'
import throttle from 'lodash.throttle'
import cloneDeep from 'lodash.clonedeep'
import { collapse } from '../utils'

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

const renderGraph = ({
  el,
  data,
  setGraphRoot,
  width,
  height,
  setHovered,
  showScriptsWithoutSourcemaps,
  showAllChildren
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
      .paddingOuter(noPadding ? 0 : 6)
      .paddingTop(noPadding ? 0 : 22)
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
    if (showAllChildren) return node
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
  const isBundle = d => d.parent && isTopLevel(d.parent)

  const renderBoxShadowBorder = d => {
    if (isTopLevel(d)) return 'white'

    if (isBundle(d)) {
      return '0 0 0 1px #000'
    }
    if (typeof d.data.averageCoverage !== 'number') return '0 0 0 1px #a8a8a8'
    const background = color(d.data.averageCoverage)
    const borderColor = d3.hsl(background).darker(1)
    return `0 0 0 1px ${borderColor}`
  }

  const createSizeLabel = d => {
    return `${Math.ceil(d.data.realSize / 1000).toLocaleString()}kb`
  }

  const createNameLabel = d => {
    if (isTopLevel(d)) return '‎'
    return `${d.data.longTask ? '🚨 ' : ''}${d.data.name}`
  }

  const shouldShow = (width, height) => {
    return showAllChildren
      ? width > 0 && height > 0
      : width > 3 && height > 3 && width * height > 50
  }

  const createEnteredElements = enter => {
    const entered = enter
      .filter(function (d) {
        const width = d.x1 - d.x0
        const height = d.y1 - d.y0
        return shouldShow(width, height)
      })
      .append('div')
      .style('background-color', d => {
        if (typeof d.data.averageCoverage !== 'number') return 'white'
        if (isTopLevel(d)) return 'white'
        return color(d.data.averageCoverage)
      })
      .style('box-shadow', renderBoxShadowBorder)
      .on('click', d => {
        if (d.data.noSourcemap) return
        setGraphRoot(d.data.id)
      })
      .on('mouseenter', function (d) {
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

        if (d.data.noSourcemap) return

        const background = color(d.data.averageCoverage)
        const borderColor = d3.hsl(background).darker(1)
        const shadowColor = d3.hsl(background).darker(2)
        this.style.boxShadow = `0 0 0 1px ${borderColor}${
          d.parent ? `, 0 5px 15px ${shadowColor}` : ''
        }`
      })
      .on('mouseleave', function (d) {
        setHovered(null)
        this.style.boxShadow = renderBoxShadowBorder(d)
      })
      .classed(`box ${isFirstRender ? 'animate-in-box' : ''} `, true)
      .attr('data-flip-id', d => d.data.id)
      .attr(
        'data-flip-config',
        '{"translate":true,"scale":true,"opacity":true}'
      )
      .classed('hide-box', d => {
        const width = d.x1 - d.x0
        const height = d.y1 - d.y0
        return !shouldShow(width, height)
      })
      .each(function (d) {
        if (d.data.longTask) {
          this.classList.add('long-task-warning')
        }
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
      .classed('no-interact', d => {
        return !d.parent || d.data.noSourcemap
      })

    const label = entered.append('div').attr('class', 'label')

    label.append('span').attr('data-name', true).text(createNameLabel)

    label.append('div').attr('data-size', true).text(createSizeLabel)
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
        .classed('hide-box', d => {
          const width = d.x1 - d.x0
          const height = d.y1 - d.y0
          return !shouldShow(width, height)
        })
        .style('top', d => `${d.y0}px`)
        .style('left', d => `${d.x0}px`)
        .style('box-shadow', renderBoxShadowBorder)
        .each(function (d) {
          this.querySelector('[data-size]').innerText = createSizeLabel(d)
          this.querySelector('[data-name]').innerText = createNameLabel(d)
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
        // must wrap this func
        exit.remove()
      }, 300)
    })
}

const updateInterval = 350

const Treemap = ({
  data,
  setGraphRoot,
  setHovered,
  showScriptsWithoutSourcemaps,
  showingCode,
  showAllChildren
}) => {
  const graphContainerRef = React.useRef(null)
  const dimensionsRef = useRef({})
  const cacheWindowSize = () => {
    dimensionsRef.current.width = window.innerWidth
    dimensionsRef.current.height = graphContainerRef.current.clientHeight
  }

  const lastCalled = React.useRef(null)
  const timerId = React.useRef(null)

  React.useEffect(() => {
    if (showingCode) return
    const throttledResize = throttle(() => {
      cacheWindowSize()

      renderGraph({
        el: graphContainerRef.current,
        data,
        setGraphRoot,
        setHovered,
        showScriptsWithoutSourcemaps,
        ...dimensionsRef.current,
        showAllChildren
      })
    }, updateInterval)
    window.addEventListener('resize', throttledResize)
    return () => {
      window.removeEventListener('resize', throttledResize)
    }
  }, [
    showingCode,
    data,
    setGraphRoot,
    setHovered,
    showScriptsWithoutSourcemaps,
    showAllChildren
  ])

  useEffect(() => {
    const now = Date.now()
    const then = lastCalled.current
    lastCalled.current = now
    function throttledRenderGraph() {
      cacheWindowSize()
      renderGraph({
        el: graphContainerRef.current,
        data,
        setGraphRoot,
        setHovered,
        ...dimensionsRef.current,
        showScriptsWithoutSourcemaps,
        showAllChildren
      })
    }
    if (then && now - then < updateInterval) {
      if (timerId.current) clearTimeout(timerId.current)
      timerId.current = setTimeout(
        throttledRenderGraph,
        updateInterval - (now - then)
      )
    } else {
      throttledRenderGraph()
    }
  }, [
    data.id,
    showScriptsWithoutSourcemaps,
    showAllChildren,
    setGraphRoot,
    data,
    setHovered
  ])

  return <div ref={graphContainerRef} className="treemap"></div>
}

export default React.memo(Treemap)
