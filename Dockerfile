
FROM node:24

WORKDIR /app

# Copy backend dependency files
COPY backend/package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy backend source files
COPY backend/ ./

EXPOSE 3000

CMD ["npm", "start"]
