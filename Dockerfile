FROM node:24-slim

# install chromium and fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation fonts-noto fonts-dejavu-core fonts-freefont-ttf \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# rebuild font cache
RUN fc-cache -f

# configure puppeteer to use the system chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# copy the package.json, which contains the dependencies
COPY package.json package-lock.json /html-to-pdf-action/

# install the dependencies
RUN npm ci --prefix /html-to-pdf-action

# copy the pdf generator script
COPY generate_pdf.js /html-to-pdf-action/generate_pdf.js

# start the action
ENTRYPOINT ["node", "/html-to-pdf-action/generate_pdf.js"]
