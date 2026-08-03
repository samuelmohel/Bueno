
# Bueno Logistics Platform Setup

## Install dependencies
npm install

## Run Docker
docker compose up -d

## Prisma
npx prisma generate
npx prisma migrate dev

## Run apps
npm run dev

## Core Modules Added
- Prisma schema
- Booking calculation service
- Dashboard starter page
- Environment setup



# Phase 2 Added Features

## Backend
- Auth module
- JWT-ready login/register flow
- WebSocket live tracking gateway
- Paystack payment service

## Frontend
- Dashboard starter
- Tracking page
- Mobile home screen

## Real-time Features
- Socket.io tracking events
- GPS update broadcasting

## Upcoming
- Admin dashboard
- Wagon allocation engine
- Route management
- Chat system
- Driver app
