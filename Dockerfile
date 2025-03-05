# 1. Use the official Node.js 20 image with Alpine
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose backend port
EXPOSE 3000

# Start the Node.js app
CMD ["npm", "start"]
