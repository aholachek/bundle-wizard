# 🧙‍♂️ sourcemap-wizard

This command line utility is built on top of [`source-map-explorer`](https://github.com/danvk/source-map-explorer) to make it very easy to create visualizations of which JS bundles were fetched for any specific entry point of an app.

`sourcemap-wizard` simply takes a url and generates a visualization that shows you:

1. All first-party JS bundles that were loaded on the page.
2. What percent of each part of those bundles was actually used to render the page.

### Reddit mobile homepage

<img src="./reddit-mobile-analysis.png" alt="reddit mobile home">

## Quick start

`npx source-map-wizard`.

That's it! The wizard will walk you through the rest.

## Requirements

1. Sourcemaps

   This utility downloads sourcemaps from the url you provide. This requires the sourcemaps to be publically available, or at least available on your network. You might need to point to a testing instead of prod build, for instance, as some apps disable sourcemaps in production.

2. A local Chrome installation

   The wizard uses `puppeteer-core` to load coverage information from the provided url. This requires you to have a version of Chrome installed on your machine.

## Optional command line arguments

### `url`

To skip the first prompt, provide a `url` as an initial argument:

`npx sourcemap-wizard nytimes.com`

### `interact` flag

By default `sourcemap-wizard` uses a headless browser to analyze a website. If you'd like to interact with the page instead (possibly navigating to new pages within the app and adding their bundles to the total set for analysis), use the following flag:

`npx sourcemap-wizard --interact`

### `type`

To skip the second prompt asking whether you want to analyze the desktop or mobile version of the url (if one exists), provide `type` as a command line argument with either `mobile` or `desktop` specified.

`npx sourcemap-wizard --type=mobile`

### `debug` flag

If you'd like to see more logging and detailed error messages, add this flag.

`npx sourcemap-wizard --debug`

## Example Run Through

<img src="./example.png" alt="example of using the wizard">

## Credits

This library is based on [`source-map-explorer`](https://github.com/danvk/source-map-explorer).
