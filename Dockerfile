# start from the official node v18 image
# we use alpine to keep the image (relatively) small
FROM node:20-alpine

# install chromium and its dependencies
RUN apk update && apk upgrade && apk add --no-cache \
    msttcorefonts-installer font-noto fontconfig \
    freetype ttf-dejavu ttf-droid ttf-freefont ttf-liberation \
    chromium \
    && rm -rf /var/cache/apk/* /tmp/*

# install fonts
RUN update-ms-fonts \
    && fc-cache -f

# convigure puppeteer
# - we don't want to use puppeteer built-in chromium (because it's old and doesn't support ARM)
# - we want to use the chromium we just installed
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# copy the package.json, which contains the dependencies
COPY package.json /html-to-pdf-action/package.json

# install the dependencies
RUN npm install --prefix /html-to-pdf-action

# copy the pdf generator script
COPY generate_pdf.js /html-to-pdf-action/generate_pdf.js

# start the action
ENTRYPOINT ["node", "/html-to-pdf-action/generate_pdf.js"]