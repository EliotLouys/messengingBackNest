FROM node:22-alpine
RUN apk add --no-cache openssl curl

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy the prisma directory first to ensure it's in a predictable location
COPY prisma ./prisma/

# Copy the rest of the source
COPY . .

# Generate client
RUN npx prisma generate

# Build the NestJS app
RUN npm run build

EXPOSE 3000

# Healthcheck probe for container orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# We use the absolute path to the schema. 
# Prisma always looks for 'migrations' in the same folder as the schema.
CMD ["sh", "-c", "npx prisma db push && node dist/main"]