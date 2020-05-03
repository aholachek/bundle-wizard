import 'sanitize.css'
import './index.scss'
import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'
import Treemap from './Treemap'
import Breadcrumbs from './Breadcrumbs'
import Summary from './Summary'
import Tooltip from './Tooltip'
import Code from './Code'
import { findMostLikelyPath } from './utils'

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

  useEffect(() => {
    fetch('./originalFileMapping.json').then(response => {
      response
        .json()
        .then(data => {
          setOriginalFileMapping(data)
        })
        .catch(e => {
          console.error('couldnt load originalFileMapping.json!')
        })
    })
    fetch('./treeData.json').then(response => {
      response.json().then(data => {
        // order is important here for setGraphRoot
        setTopLevelData(data)
        setData(data)
      })
    })
  }, [])

  const setGraphRoot = React.useCallback(
    id => {
      const data = findBranch(id, topLevelData)
      if (!data.children) {
        const simplifiedName = data.name.replace('.js', '')
        const fileKeys = Object.keys(originalFileMapping)
        if (!fileKeys) {
          console.error('unable to access original file data')
        } else {
          const matchingKeys = fileKeys.filter(
            key => key.indexOf(simplifiedName) !== -1
          )
          const mostLikelyPath = findMostLikelyPath(matchingKeys, data.id)

          const text = originalFileMapping[mostLikelyPath]
          if (!text) {
            setData(data)
            return setCode(null)
          }
          setCode({ text, name: mostLikelyPath })
        }
      } else {
        if (code) {
          setCode({ ...code, animatingOut: true })
          setTimeout(() => {
            setCode(null)
          }, 500)
        }
      }
      setData(data)
    },
    [setData, topLevelData, code, originalFileMapping]
  )

  if (!data) return <div className="loading">loading...</div>

  const showingCode = Boolean(code)

  return (
    <div>
      <Tooltip hovered={hovered} />
      <nav className="nav">
        <div className="logo">
          Analysis of <b>{(topLevelData || {}).url}</b>
        </div>
        <ul>
          <li></li>
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
            setGraphRoot={setGraphRoot}
            hovered={hovered}
            toggleScriptsWithoutSourcemaps={toggleScriptsWithoutSourcemaps}
            showScriptsWithoutSourcemaps={showScriptsWithoutSourcemaps}
          />
          <Treemap
            data={data}
            setGraphRoot={setGraphRoot}
            setHovered={setHovered}
            showScriptsWithoutSourcemaps={showScriptsWithoutSourcemaps}
            showingCode={showingCode}
          />
          {showingCode && <Code {...code} setHovered={setHovered} />}
        </>
      )}
    </div>
  )
}

ReactDOM.render(<Dashboard />, document.getElementById('container'))
