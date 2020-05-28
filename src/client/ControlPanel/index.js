import React from 'react'
import * as d3 from 'd3'

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
  setShowAllChildren
}) => {
  return (
    <div className={`control-panel `}>
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

      <div>
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
            show coverage {showCoverage && <Legend />}
          </label>
        </div>
      </div>
    </div>
  )
}

export default ControlPanel
