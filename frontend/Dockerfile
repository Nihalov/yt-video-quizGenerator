# --- Stage 1: Build the React application ---
FROM node:20-alpine as builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . ./

# Build the production-ready static files
RUN npm run build


# --- Stage 2: Serve the application with Nginx ---
FROM nginx:stable-alpine

# Copy the built files from the 'builder' stage
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 80 (Nginx's default port)
EXPOSE 80

# The default Nginx command starts the server
CMD ["nginx", "-g", "daemon off;"]