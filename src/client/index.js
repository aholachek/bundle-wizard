import 'sanitize.css'
import './index.scss'
import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'
import Treemap from './Treemap'
import Breadcrumbs from './Breadcrumbs'
import Summary from './Summary'
import Tooltip from './Tooltip'
import Code from './Code'
import { findMostLikelyPath, convertToTree } from './utils'
import ControlPanel from './ControlPanel'

const jsonOptions = {
  headers: {
    'Content-Type': 'application/json'
  }
}

const findBranch = (id, data) => {
  let cachedBranch
  const inner = branch => {
    if (cachedBranch) return
    if (branch.id === id) cachedBranch = branch
    if (branch.children) branch.children.forEach(inner)
  }
  inner(data)
  return cachedBranch
}

const Dashboard = () => {
  const [data, _setData] = React.useState(null)
  const [hovered, setHovered] = React.useState(null)
  const [showSummary, setShowSummary] = React.useState(false)
  const [showAllChildren, setShowAllChildren] = React.useState(false)
  const [showRuntimeData, setShowRuntimeData] = React.useState(false)

  const [showCoverage, setShowCoverage] = React.useState(true)
  const [topLevelData, setTopLevelData] = React.useState({})
  const [
    showScriptsWithoutSourcemaps,
    setShowScriptsWithoutSourcemaps
  ] = React.useState(false)
  const [code, setCode] = React.useState(false)
  const [originalFileMapping, setOriginalFileMapping] = React.useState({})

  const isTopLevel = data && data.name === 'topLevel'

  const toggleScriptsWithoutSourcemaps = () => {
    setShowScriptsWithoutSourcemaps(!showScriptsWithoutSourcemaps)
  }

  const setData = React.useCallback(
    data => {
      _setData(data)
      setHovered(null)
    },
    [_setData, setHovered]
  )

  const runtimeTree = React.useMemo(() => convertToTree(topLevelData), [
    topLevelData
  ])

  useEffect(() => {
    fetch('./treeData.json', jsonOptions).then(response => {
      response.json().then(data => {
        // order is important here for setGraphRoot
        setTopLevelData(data)
        setData(data)
      })
    })
    fetch('./originalFileMapping.json', jsonOptions).then(response => {
      response
        .json()
        .then(data => {
          setOriginalFileMapping(data)
        })
        .catch(e => {
          console.error('couldnt load originalFileMapping.json!')
        })
    })
  }, [])

  console.log(runtimeTree)

  const setGraphRoot = React.useCallback(
    id => {
      const data = showRuntimeData
        ? findBranch(id, runtimeTree)
        : findBranch(id, topLevelData)

      if (data && (!data.children || data.children.length === 0)) {
        const simplifiedName = data.name.replace('.js', '')
        const fileKeys = Object.keys(originalFileMapping)
        if (!fileKeys) {
          console.error('unable to access original file data')
        } else {
          const matchingKeys = fileKeys.filter(
            key => key.indexOf(simplifiedName) !== -1
          )
          const mostLikelyPath = findMostLikelyPath(matchingKeys, data.id)
          const id = originalFileMapping[mostLikelyPath]

          fetch(`./originalFiles/${id}.json`)
            .then(response => response.json())
            .then(text => {
              if (text) setCode({ text, name: mostLikelyPath, data })
            })
            .catch(e => {
              console.log(e)
              setCode(null)
            })
        }
      } else {
        if (code) setCode(null)
      }
      setData(data)
    },
    [setData, topLevelData, code, originalFileMapping, showRuntimeData]
  )

  if (!data) return <div className="loading">loading...</div>

  const showingCode = Boolean(code)

  return (
    <div className={!showCoverage && 'hide-coverage'}>
      <Tooltip hovered={hovered} />
      <nav className="nav">
        <div className="logo">
          Analysis of <b>{(topLevelData || {}).url}</b>
        </div>
        <ul>
          <li className={!showSummary && 'active'}>
            <a
              href="#"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                setShowSummary(false)
              }}
            >
              🌲&nbsp;Treemap
            </a>
          </li>
          <li className={showSummary && 'active'}>
            <a
              href="#"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                setShowSummary(true)
              }}
            >
              ℹ️&nbsp;Summary
            </a>
          </li>
        </ul>
        <div style={{ marginLeft: 'auto' }}>
          👇 scroll down to view more options
        </div>
      </nav>
      {showSummary ? (
        <Summary
          data={topLevelData}
          setGraphRoot={(...args) => {
            setShowSummary(false)
            setGraphRoot(...args)
          }}
        />
      ) : (
        <>
          <Breadcrumbs
            data={data}
            isTopLevel={isTopLevel}
            setGraphRoot={(...args) => {
              setCode(null)
              setGraphRoot(...args)
            }}
            hovered={hovered}
            toggleScriptsWithoutSourcemaps={toggleScriptsWithoutSourcemaps}
            showScriptsWithoutSourcemaps={showScriptsWithoutSourcemaps}
          />
          {!showingCode && (
            <Treemap
              data={showRuntimeData ? runtimeTree : data}
              setGraphRoot={setGraphRoot}
              setHovered={setHovered}
              showScriptsWithoutSourcemaps={showScriptsWithoutSourcemaps}
              showingCode={showingCode}
              showAllChildren={showAllChildren}
            />
          )}
          {showingCode && <Code {...code} setHovered={setHovered} />}

          {!showingCode && (
            <ControlPanel
              toggleScriptsWithoutSourcemaps={toggleScriptsWithoutSourcemaps}
              showScriptsWithoutSourcemaps={showScriptsWithoutSourcemaps}
              setShowCoverage={setShowCoverage}
              showCoverage={showCoverage}
              isTopLevel={isTopLevel}
              showRuntimeData={showRuntimeData}
              showAllChildren={showAllChildren}
              setShowAllChildren={setShowAllChildren}
              wrappedSetShowRuntimeData={() => {
                setShowRuntimeData(!showRuntimeData)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}

ReactDOM.render(<Dashboard />, document.getElementById('container'))
