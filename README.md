# html-to-pdf-action

This action will automatically render a webpage into a PDF.

Because it integrates a web-server, it will have no problems importing css, js and fonts (local or external), and will wait for everything to render properly before rending the output to a PDF. It means your webpage doesn't have to be a static HTML page, but can also use javascript frameworks.

The action internally uses chromium, so the rendered PDF won't have the weird problems you can have with Firefox or WebKit.

Here is an example use of the action:

```yml
- name: HTML website to PDF converter
  uses: ferdinandkeller/html-to-pdf-action@v1.3.0
  with:
    - source-path: './dist'
    - destination-path: './pdf/resume.pdf'
```