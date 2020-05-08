import React from 'react'
import styled, { keyframes, css } from 'styled-components'
import Highlight, { defaultProps } from 'prism-react-renderer'
import theme from 'prism-react-renderer/themes/palenight'

const fadeIn = keyframes`
  from {
    opacity: 0
  }
  to {
    opacity: 1;
  }
`

const fadeOut = keyframes`
  from {
    opacity: 1
  }
  to {
    opacity: 0;
  }
`

const fontFamily = `font-family: 'Source Code Pro', 'SFMono-Regular', Consolas, 'Liberation Mono',
    Menlo, Courier, monospace;`

const Container = styled.div`
  top: 5.75rem;
  animation: ${props =>
    props.animatingOut
      ? css`
          ${fadeOut} .25s forwards;
        `
      : css`
          ${fadeIn} 2s forwards;
        `}
  position: absolute;
  left: 0;
  bottom: 0;
  right: 0;
  z-index: 100;
  overflow: auto;
  height: 100vh;
  background: rgb(41, 45, 62);
  color: white;
  padding: 2rem;
  padding-top: 1rem;
  ${fontFamily};
  pre,
  code {
    ${fontFamily}
  }
`

const threshold = 70000

const TimeBreakdown = ({ data }) => {
  return (
    <div className="breakdown">
      <b>Breakdown</b>
      {Object.keys(data)
        .filter(d => Math.floor(data[d]) && d !== 'total')
        .map(d => {
          return (
            <div>
              {d}: {Math.floor(data[d])}ms
            </div>
          )
        })}
    </div>
  )
}

export default function Code({ text, setHovered, data }) {
  const linesToHighlight =
    data &&
    data.details &&
    data.details.map(detail => detail[0].parsedSourcemap.line)

  const timeBreakdown =
    data &&
    data.details
      .map(data => data[1])
      .reduce((acc, curr) => {
        Object.keys(curr).forEach(key => {
          acc[key] = acc[key] || 0 + curr[key]
        })
        return acc
      })

  React.useEffect(() => {
    setHovered(null)
    setTimeout(() => {
      setHovered(null)
    }, 10)
  }, [text])
  if (!text) return null
  if (text.length > threshold) {
    return (
      <Container>
        <div>{text}</div>
      </Container>
    )
  }

  return (
    <Container>
      {timeBreakdown && <TimeBreakdown data={timeBreakdown} />}
      <Highlight {...defaultProps} code={text} language="jsx" theme={theme}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={className} style={style}>
            {tokens.map((line, i) => (
              <div
                {...getLineProps({ line, key: i })}
                style={{
                  opacity: linesToHighlight
                    ? linesToHighlight.indexOf(i + 1) > -1
                      ? 1
                      : 0.3
                    : 1
                }}
              >
                {line.map((token, key) => (
                  <span {...getTokenProps({ token, key })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </Container>
  )
}
