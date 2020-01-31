# 🧙‍♂️ sourcemap-wizard

This small command line utility is build on top of [source-map-explorer]() to help you easily create visualizations of the bundles fetched for any specific entry point of an app.

## Example

Here's a visualization of the js bundles fetched by Pinterest on desktop when loading the home screen:

<img src="./pinterest_desktop_home_example.png" alt="pinterest desktop home js bundle coverage visualization">

## Installation

### For global access:

`npm install -g sourcemap-wizard`

### Or in a project:

`npm install sourcemap-wizard`

## More info

You'll need to use the Chrome browser to [generate the coverage report](https://developers.google.com/web/tools/chrome-devtools/coverage) for the entry point you wish to analyze.
