FROM node:20-alpine as builder

WORKDIR /server
COPY package.json ./
RUN npm install

COPY . .

RUN npm run format:check
RUN npm run lint:check
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]