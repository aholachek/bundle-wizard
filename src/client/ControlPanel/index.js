import React from 'react'
import * as d3 from 'd3/dist/d3'
import styled from 'styled-components'

const StyledInput = styled.input`
  border: 0;
  padding: 0.3rem;
  box-shadow: none;
  border-radius: 3px;
  outline: none;
  box-shadow: 0 0 0 1px hsla(0, 0%, 100%, 0.4);

  &:focus {
    box-shadow: 0 0 0 2px hsla(0, 0%, 100%, 0.8);
  }
  background-color: rgba(145, 145, 145, 0.3);

  @media (min-width: 992px) {
    min-width: 15rem;
  }

  color: white;
`

const color = d3.scaleSequential([-0.2, 1.15], d3.interpolateRdYlGn)

const Legend = () => {
  return (
    <div className="legend">
      <div className="legend__colors">
        <div className="legend__label">0%</div>
        {[...Array(6).keys()].map(i => (
          <div style={{ backgroundColor: color(i / 5) }} key={i}></div>
        ))}
        <div className="legend__label">100%</div>
      </div>
    </div>
  )
}

const ControlPanel = ({
  toggleScriptsWithoutSourcemaps,
  showScriptsWithoutSourcemaps,
  setShowCoverage,
  showCoverage,
  isTopLevel,
  showAllChildren,
  setShowAllChildren,
  searchStr,
  setSearchStr
}) => {
  return (
    <div className={`control-panel `}>
      <div>
        {isTopLevel && (
          <div className="sourcemap-control">
            <label>
              <input
                type="checkbox"
                title="uncheck to see only JS bundles"
                name=""
                onChange={toggleScriptsWithoutSourcemaps}
                checked={showScriptsWithoutSourcemaps}
              />
              show JSON & 3rd party scripts
            </label>
          </div>
        )}

        <div className="sourcemap-control">
          <label>
            <input
              type="checkbox"
              name=""
              title="simplified graph is better for performance"
              onChange={() => {
                setShowAllChildren(!showAllChildren)
              }}
              checked={!showAllChildren}
            />
            simplify graph
          </label>
        </div>

        <div className="sourcemap-control">
          <label>
            <input
              type="checkbox"
              name=""
              title="coverage represents the percentage of the code that was run"
              onChange={() => {
                setShowCoverage(!showCoverage)
              }}
              checked={showCoverage}
            />
            show coverage <Legend />
          </label>
        </div>

        <label className="search">
          search:&nbsp;&nbsp;
          <StyledInput
            type="text"
            value={searchStr}
            onChange={e => {
              setSearchStr(e.target.value)
            }}
          />
        </label>
      </div>
    </div>
  )
}

export default ControlPanel
