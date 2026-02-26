# Use Node 22 (matching your GitHub CI setup)
FROM node:22-alpine

RUN apk add --no-cache openssl

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of your application code
COPY . .

# Generate Prisma Client (Required for your database to work)
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

# Expose the port your app runs on
EXPOSE 3000

# Command to run the app in production
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]