# start from the official node v18 image
# we use alpine to keep the image (relatively) small
FROM node:24-alpine

# install chromium and its dependencies
RUN apk update && apk upgrade && apk add --no-cache \
    msttcorefonts-installer font-noto fontconfig \
    freetype ttf-dejavu ttf-droid ttf-freefont ttf-liberation \
    chromium \
    && rm -rf /var/cache/apk/* /tmp/*

# install fonts
RUN update-ms-fonts \
    && fc-cache -f

# configure puppeteer to use the system chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# copy the package.json, which contains the dependencies
COPY package.json /html-to-pdf-action/package.json

# install the dependencies
RUN npm install --prefix /html-to-pdf-action

# copy the pdf generator script
COPY generate_pdf.js /html-to-pdf-action/generate_pdf.js

# start the action
ENTRYPOINT ["node", "/html-to-pdf-action/generate_pdf.js"]