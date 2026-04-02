FROM node:18-slim

# ffmpeg  – required by Baileys for audio/video message processing
# libvips – required by the 'sharp' dependency used for birthday card rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libvips-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (layer-cached as long as package*.json unchanged)
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN npm run build

# Create the persistent auth directory.
# In Coolify: mount a named volume at /app/auth_session so the WhatsApp
# session survives container redeploys and prevents constant QR re-scans.
RUN mkdir -p /app/auth_session && chmod 777 /app/auth_session

EXPOSE 3000

CMD ["npm", "start"]
