# 🧙‍♂️ bundle-wizard

This command line utility makes it simple to create visualizations of the JS bundles that were fetched for any specific page (or "entry point") of a web app.

## Example

`npx bundle-wizard spectrum.chat`

<a href="https://bundle-wizard-spectrum.netlify.app/">
<img src="./reddit-mobile-analysis.png" alt="bundle-wizard interaction showing code for reddit">
</a>

[Check out a live demo of this visualization](https://bundle-wizard-spectrum.netlify.app/)

## Try it out on a production app:

Try any of the following commands to take a peek at the JavaScript code different sites are shipping:

1. `npx bundle-wizard spectrum.chat`
2. `npx bundle-wizard reddit.com`
3. `npx bundle-wizard codesandbox.io`
4. `npx bundle-wizard gatsbyjs.org`
5. `npx bundle-wizard codecademy.com`
6. `npx bundle-wizard id.atlassian.com`

## Try it out on an app running locally:

Want to use bundle-wizard but haven't deployed your app yet? It's as easy as:

#### 1. Build your app locally

e.g. `npm run build`

#### 2. Serve the build folder

e.g. `npx serve -s build`

#### 3. Call bundle-wizard with the correct localhost url

e.g. `npx bundle-wizard localhost:5000/sign-up`

## Optional command line arguments

### `url` (initial argument)

To skip the initial prompt, provide a url as a first argument:

`npx bundle-wizard reddit.com`

### `desktop` flag

By default, `bundle-wizard` will analyze a mobile version of the site. To analyze the desktop version instead, pass the `--desktop` flag:

`npx bundle-wizard --desktop`

### `debug` flag

If you'd like to see more logging and detailed error messages, add this flag.

`npx bundle-wizard --debug`

### `ignoreHTTPSErrors` flag

If you are running an HTTPS connection on localhost and want to test a local site, you'll need to use this setting to prevent self-signed certificate errors:

`npx bundle-wizard https://localhost:5000 --ignoreHTTPSErrors`

## Credits

The core functionality of this library is provided by the awesome [`source-map-explorer`](https://github.com/danvk/source-map-explorer).

## Requirements

1. Downloadable sourcemaps

   This utility downloads sourcemaps from the url you provide. This requires the sourcemaps to be publically available, or at least available on your network. You might need to point to a testing instead of production build, for instance, as some apps disable sourcemaps in production.

   Don't have access to sourcemaps in your prod app? Try [building your app locally.](#try-it-out-on-an-app-running-locally)

2. A local Chrome installation

   The wizard uses `puppeteer-core` to load coverage information from the provided url. This requires you to have a fairly up-to-date version of Chrome installed on your machine.

## Additional features

If sourcemaps are properly configured (not true for reddit.com), you should be able to click on a square to see the code it represents: 

![demonstration of code feature](./example.gif)
