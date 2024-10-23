// import puppeteer, which is based on a chromium browser
const puppeteer = require('puppeteer')
// import path to compose the paths
const path = require('path')
// import a http server to serve the files
const hs = require('http-server')

// primitive arguments parser
let args = {}
let waiting = false
let arg_name = ''
for (let arg_index = 2; arg_index < process.argv.length; arg_index++) {
    let arg = process.argv[arg_index]
    if (waiting) {
        let maybe_num = Number(arg)
        if (!isNaN(maybe_num)) {
            arg = maybe_num
        }
        args[arg_name] = arg
        waiting = false
    } else {
        if (arg.substring(0, 2) === '--') {
            arg_name = arg.substring(2)
            waiting = true
        } else {
            throw new Error('Invalid argument: ' + arg)
        }
    }
}

// throw an error if some aguments are missing
if (!('source-path' in args)) {
    throw new Error('Missing argument: --source-path')
}
if (!('destination-path' in args)) {
    throw new Error('Missing argument: --destination-path')
}

// start a server to serve the files
// we can't simply server the files locally using 'file://' because imports in a website are relative to the root
// so when you want to import your CSS styles, you will have an element with the url '/style.css', where you would need
// 'file:///path/to/root/style.css' to make it work
// to avoid this, we start a server and serve the files from there, and then we can use the url 'http://127.0.0.1'
let server = hs.createServer({
    root: path.join(
        process.env.GITHUB_WORKSPACE || __dirname,
        args['source-path']
    ),
    cache: -1,
})
server.listen(8000, '0.0.0.0', generate_pdf)

// we want to run this code in a asynchronous context
async function generate_pdf() {
    // launch the browser
    const browser = await puppeteer.launch({
        args: [
            // we are running inside docker, we don't want a window
            '--headless',
            // we provide a default (virtual) window size
            // that way it's consistent across different environments
            '--window-size=1920,1080',
            // we want the window at the top left corner of the (virtual) screen
            '--window-position=0,0',

            // when starting the browser for the first time, we don't want to see a welcome page
            // we want to directly go to the website
            '--no-first-run',
            // we don't want to see scrollbars
            '--hide-scrollbars',
            // we don't want popup saying "chromium is being controlled by automated software"
            '--disable-infobars',
            // we don't want to see any notifications, there is no one to interact with them
            '--disable-notifications',

            // because we are generating a pdf, we don't need any extensions
            // there shouldn't be any anyway, but just to be sure
            '--disable-extensions',

            // we are inside a docker container, where sandboxing is broken
            // we (likely) don't need the sandbox anyway
            '--no-sandbox',
            // absolutely required with our execution environment, else chromium will not start
            '--disable-setuid-sandbox',

            // we also need to disable the shared memory
            // our container has a very limited amount of memory
            '--disable-dev-shm-usage',
            // we won't be using the audio, so we can mute it
            '--mute-audio',
            // we don't have a GPU in the docker container
            '--disable-gpu',
            // we don't have access to hardware acceleration
            '--disable-accelerated-2d-canvas',
            // we don't want chromium to run any background tasks,
            // we don't need them and it might slow down the process
            '--disable-background-networking',
            '--disable-component-extensions-with-background-pages',
            '--dns-prefetch-disable',
            // we don't care about certificate errors that could hinder the process
            '--ignore-certificate-errors',
            // we want that to also apply to the skip list
            '--ignore-certificate-errors-skip-list',
            // chromium can throttle background pages, we don't want that
            '--disable-background-timer-throttling',
            // chromium can limit the resources of background pages, we don't want that
            '--disable-renderer-backgrounding',
            // chromium can also stop rendering when the page is occluded, we don't want that
            '--disable-backgrounding-occluded-windows',
            // in case of crash, we don't want to send a crash report
            '--disable-breakpad',
            // no translation is wanted
            '--disable-features=TranslateUI,BlinkGenPropertyTrees,IsolateOrigins,site-per-process',

            // we want to use the srgb color profile, as this is the default color profile for the web
            // without that, we will see color differences between the website and the pdf
            '--force-color-profile=srgb',
            // we don't want the browser to scale the website
            '--force-device-scale-factor=1',
            // absolutely needed, else you will see font kerning problems in the pdf
            '--font-render-hinting=none',
        ],
    })

    // create a page
    const page = await browser.newPage()

    // set a proper user agent to act like a normal browser
    await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36'
    )

    // go to the website
    await page.goto('http://localhost:8000', {
        // we want to wait until the page is fully loaded (this includes images, styles, fonts, etc.)
        waitUntil: 'networkidle0',
    })

    // render the page to a pdf
    await page.pdf({
        path: path.join(
            process.env.GITHUB_WORKSPACE || __dirname,
            args['destination-path']
        ),
        format: 'A4',
        printBackground: true,
    })

    // close browser
    await browser.close()

    // close the server
    server.close()
}
