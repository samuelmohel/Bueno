FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/out /usr/share/nginx/html
RUN sed -i 's/listen       80;/listen 80;\n    listen 3000;/g' /etc/nginx/conf.d/default.conf
EXPOSE 80 3000
CMD ["nginx", "-g", "daemon off;"]
