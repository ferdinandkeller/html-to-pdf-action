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
    root: path.join(process.env.GITHUB_WORKSPACE || __dirname, args['source-path']),
    cache: -1,
})
server.listen(8080, '127.0.0.1', generate_pdf)

// we want to run this code in a asynchronous context
async function generate_pdf() {
    // launch the browser
    const browser = await puppeteer.launch({
        args: ['--no-sandbox'],
    })

    // create a page
    const page = await browser.newPage()

    // go to the website
    await page.goto('http://127.0.0.1:8080/', {
        // we want to wait until the page is fully loaded (this includes images, styles, fonts, etc.)
        waitUntil: 'networkidle',
    })

    // render the page to a pdf
    await page.pdf({
        path: path.join(process.env.GITHUB_WORKSPACE || __dirname, args['destination-path']),
        format: 'A4',
        preferCSSPageSize: true,
        printBackground: true,
    })

    // close browser
    await browser.close()

    // close the server
    server.close()
}