import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'

const mockLaunch = vi.fn()
const mockStatSync = vi.fn()

vi.mock('puppeteer-core', () => ({
    default: { launch: mockLaunch },
}))

vi.mock('fs', () => ({
    default: { statSync: mockStatSync },
}))

const { parseArgs, generate_pdf, resolveSource } = await import('./generate_pdf.js')

// --- parseArgs ---

describe('parseArgs', () => {
    test('parses source and destination paths', () => {
        const args = parseArgs([
            'node', 'script.js',
            '--source-path', './src',
            '--destination-path', './out.pdf',
        ])
        expect(args['source-path']).toBe('./src')
        expect(args['destination-path']).toBe('./out.pdf')
    })

    test('converts numeric argument values to numbers', () => {
        const args = parseArgs([
            'node', 'script.js',
            '--source-path', './src',
            '--destination-path', './out.pdf',
            '--port', '9000',
        ])
        expect(args['port']).toBe(9000)
    })

    test('keeps string values that are not numeric', () => {
        const args = parseArgs([
            'node', 'script.js',
            '--source-path', './my-app',
            '--destination-path', './output.pdf',
        ])
        expect(typeof args['source-path']).toBe('string')
    })

    test('throws on missing --source-path', () => {
        expect(() =>
            parseArgs(['node', 'script.js', '--destination-path', './out.pdf'])
        ).toThrow('Missing argument: --source-path')
    })

    test('throws on missing --destination-path', () => {
        expect(() =>
            parseArgs(['node', 'script.js', '--source-path', './src'])
        ).toThrow('Missing argument: --destination-path')
    })

    test('throws on argument that is not a flag', () => {
        expect(() =>
            parseArgs(['node', 'script.js', 'not-a-flag'])
        ).toThrow('Invalid argument: not-a-flag')
    })

    test('throws when no arguments are provided', () => {
        expect(() => parseArgs(['node', 'script.js'])).toThrow()
    })
})

// --- resolveSource ---

describe('resolveSource', () => {
    afterEach(() => vi.restoreAllMocks())

    test('returns directory and / when source-path is a directory', () => {
        mockStatSync.mockReturnValue({ isFile: () => false, isDirectory: () => true })
        const result = resolveSource('./src')
        expect(result.urlPath).toBe('/')
        expect(result.root).toContain('src')
    })

    test('returns parent directory and filename when source-path is a file', () => {
        mockStatSync.mockReturnValue({ isFile: () => true, isDirectory: () => false })
        const result = resolveSource('./instructions/product_list.html')
        expect(result.urlPath).toBe('/product_list.html')
        expect(result.root).toContain('instructions')
        expect(result.root).not.toContain('product_list.html')
    })
})

// --- generate_pdf ---

describe('generate_pdf', () => {
    let mockPage, mockBrowser, mockServer

    beforeEach(() => {
        // Default: source-path is a directory
        mockStatSync.mockReturnValue({ isFile: () => false, isDirectory: () => true })

        mockPage = {
            setUserAgent: vi.fn().mockResolvedValue(undefined),
            goto: vi.fn().mockResolvedValue(undefined),
            pdf: vi.fn().mockResolvedValue(undefined),
        }
        mockBrowser = {
            newPage: vi.fn().mockResolvedValue(mockPage),
            close: vi.fn().mockResolvedValue(undefined),
        }
        mockServer = {
            close: vi.fn(),
        }
        mockLaunch.mockResolvedValue(mockBrowser)
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    test('launches puppeteer with required sandbox flags', async () => {
        await generate_pdf(
            { 'source-path': './src', 'destination-path': './out.pdf' },
            mockServer
        )
        expect(mockLaunch).toHaveBeenCalledWith(
            expect.objectContaining({
                args: expect.arrayContaining([
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                ]),
            })
        )
    })

    test('navigates to localhost:8000/ for directory source-path', async () => {
        await generate_pdf(
            { 'source-path': './src', 'destination-path': './out.pdf' },
            mockServer
        )
        expect(mockPage.goto).toHaveBeenCalledWith('http://localhost:8000/', {
            waitUntil: 'networkidle0',
        })
    })

    test('navigates to localhost:8000/file.html for file source-path', async () => {
        mockStatSync.mockReturnValue({ isFile: () => true, isDirectory: () => false })
        await generate_pdf(
            { 'source-path': './instructions/product_list.html', 'destination-path': './out.pdf' },
            mockServer
        )
        expect(mockPage.goto).toHaveBeenCalledWith('http://localhost:8000/product_list.html', {
            waitUntil: 'networkidle0',
        })
    })

    test('generates PDF with A4 format and background printing', async () => {
        await generate_pdf(
            { 'source-path': './src', 'destination-path': './out.pdf' },
            mockServer
        )
        expect(mockPage.pdf).toHaveBeenCalledWith(
            expect.objectContaining({
                format: 'A4',
                printBackground: true,
            })
        )
    })

    test('PDF output path incorporates destination-path argument', async () => {
        const destPath = './output/result.pdf'
        await generate_pdf(
            { 'source-path': './src', 'destination-path': destPath },
            mockServer
        )
        const pdfCall = mockPage.pdf.mock.calls[0][0]
        expect(pdfCall.path).toContain('result.pdf')
    })

    test('closes browser and server after successful generation', async () => {
        await generate_pdf(
            { 'source-path': './src', 'destination-path': './out.pdf' },
            mockServer
        )
        expect(mockBrowser.close).toHaveBeenCalledTimes(1)
        expect(mockServer.close).toHaveBeenCalledTimes(1)
    })

    test('rejects when puppeteer.launch fails', async () => {
        mockLaunch.mockRejectedValue(new Error('Chrome not found'))
        await expect(
            generate_pdf(
                { 'source-path': './src', 'destination-path': './out.pdf' },
                mockServer
            )
        ).rejects.toThrow('Chrome not found')
    })

    test('rejects when page navigation fails', async () => {
        mockPage.goto.mockRejectedValue(new Error('Navigation timeout'))
        await expect(
            generate_pdf(
                { 'source-path': './src', 'destination-path': './out.pdf' },
                mockServer
            )
        ).rejects.toThrow('Navigation timeout')
    })

    test('rejects when pdf generation fails', async () => {
        mockPage.pdf.mockRejectedValue(new Error('PDF write error'))
        await expect(
            generate_pdf(
                { 'source-path': './src', 'destination-path': './out.pdf' },
                mockServer
            )
        ).rejects.toThrow('PDF write error')
    })
})
