// import puppeteer, which is based on a chromium browser
const puppeteer = require('puppeteer')
// import path to compose the paths
const path = require('path')

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

// we want to run this code in a asynchronous context
(async () => {
    // launch the browser
    const browser = await puppeteer.launch({
        args: ['--no-sandbox'],
    })

    // create a page
    const page = await browser.newPage()

    // go to the website
    await page.goto('file://' + path.join(process.env.GITHUB_WORKSPACE || __dirname, args['source-path'], 'index.html'))

    // render the page to a pdf
    await page.pdf({
        path: path.join(process.env.GITHUB_WORKSPACE || __dirname, args['destination-path']),
        format: 'A4',
        preferCSSPageSize: true,
        printBackground: true,
    })

    // close browser
    await browser.close()
})()