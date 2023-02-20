
# Stage 0, Build and compile the frontend (based on Node.js)
FROM node:16.4.0-alpine as build-stage

WORKDIR /app

# Build in relation to the environment
# build / build:dev / build:stage
ARG BUILDCMD=build

COPY package*.json /app/

RUN npm install

COPY ./ /app/

RUN echo "Build environment : $BUILDCMD"
RUN npm run $BUILDCMD

# Stage 1, Compiled app (based on Nginx)
FROM nginx:stable-alpine

ENV NODE_ENV=development
ENV HOST=http://localhost:3000
ENV TMAPIKEY=
ENV TMHOST=http://localhost:3000

RUN rm /usr/share/nginx/html/50x.html 
RUN rm /usr/share/nginx/html/index.html

COPY --from=build-stage /app/dist/ /usr/share/nginx/html

# Copy the nginx configuration from source
COPY ./nginx-default.conf /etc/nginx/conf.d/default.conf
COPY ./docker-host.sh ./docker-entrypoint.d/01-config-api-host.sh
