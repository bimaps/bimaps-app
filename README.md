# `Bimaps-app`

This project is based on many Open Source Library (Three.js, IFCjs, ...).
Documentation and more info : [docs.bimaps.io](https://docs.bimaps.io/)

<br>

## Start to customize files:
- environment.json.sample : environment.json
- environment.production.json.sample : environment.production.json
- environment.staging.json.sample : environment.staging.json

<br>

## Run dev app

1. Clone repo : 
  - `git clone repoUrl`
2. Run `npm install` for installing all packages
3. Run `npm run start:stage`, then open `http://localhost:8082` in your browser


## Build for production

Run `npm run build`


## Build with Docker

1. Run `npm install`
2. Run `npm run build`
3. Build Docker, for example :
    ```
    docker build -t bimaps-app .
    docker tag bimaps-app:latest bimaps-app:$VERSION
    docker push bimaps-app:$VERSION
    docker push bimaps-app:latest
    ```
4. Start container `docker run --restart always --name bimaps -p 80:80 -d --network=sdionet -e HOST=${urlAPI:3000} bimaps-app`
5. Change API URL in Docker App run : `docker exec -it bimaps sh /docker-host.sh`
