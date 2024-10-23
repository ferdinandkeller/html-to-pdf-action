# html-to-pdf-action

This action will automatically render any local webpage into a PDF.

Because it integrates its own web-server, it has no problems importing css, js and fonts (whether available locally or referenced online, including from websites like google fonts), and will wait for everything to render properly before rending the output to a PDF. It means your webpage doesn't have to be a static HTML page, but can also use any javascript framework.

The action internally uses chromium, so the rendered PDF won't have any of the weird problems that exist with Firefox or WebKit, like:
- font kerning
- missing styles or resources
- javascript not executed before rendering
- ... 

Here is an example on how to use the action:

```yml
- name: HTML website to PDF converter
  uses: ferdinandkeller/html-to-pdf-action@v2
  with:
    - source-path: "./dist"
    - destination-path: "./out.pdf"
```

The `source-path` parameter specify which directory contains your builded html (your main file must be called `index.html`), while `destination-path` is the path where you want to put your PDF.

With a bit more context:

```yml
name: Convert HTML to PDF

on:
  push:
    branches:
      - main
  workflow_dispatch: # allows manual trigger of the action

jobs:
  convert-html:
    runs-on: ubuntu-latest

    steps:
      # Checkout the repository
      - name: Checkout code
        uses: actions/checkout@v4

      # Run the HTML to PDF converter action
      - name: HTML website to PDF converter
        uses: ferdinandkeller/html-to-pdf-action@v2
        with:
          source-path: "./dist"
          destination-path: "./out.pdf"

      # Upload the PDF as an artifact
      - name: Upload PDF
        uses: actions/upload-artifact@v4
        with:
          name: generated-pdf
          path: ./out.pdf
```

Even though puppeteer (which this generator uses) only supports `AMD64`, thanks to some tweeking this Dockerfile and this GitHub action can work on pretty much any architecture supported by chromium, including on `AMD64` and `ARM64`.