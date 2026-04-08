#!/bin/bash
set -e

echo "Updating system..."
sudo apt-get update

echo "Installing Node.js and Nginx..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx

echo "Installing PM2..."
sudo npm install pm2 -g

echo "Cloning Repository..."
if [ ! -d "Carreer-Chatbot" ]; then
  git clone https://github.com/DEEPAK-310705/Carreer-Chatbot.git
else
  echo "Repository already exists, pulling latest..."
  cd Carreer-Chatbot
  git pull
  cd ..
fi

cd Carreer-Chatbot

echo "Installing Root Packages..."
npm install

echo "Installing Server Packages..."
cd server
npm install

echo "Building Frontend..."
cd ..
npm run build

echo "Setting up .env file..."
cat << 'EOF' > server/.env
GEMINI_API_KEY=AIzaSyAFXxupEWpPi3VCe_q400jmQKBwNtvgNZE
MONGODB_URI=mongodb+srv://deepakmishra310705_db_user:Dee%40310705@cluster0.6jjbhtw.mongodb.net/careerbot?appName=Cluster0
PORT=3001
NODE_ENV=production
EOF

echo "Starting Server with PM2..."
cd server
pm2 stop careerbot || true
pm2 start server.js --name "careerbot"
pm2 save

echo "Configuring Nginx Reverse Proxy..."
cat << 'EOF' | sudo tee /etc/nginx/sites-available/default
server {
    listen 80;
    server_name _; 

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

echo "Restarting Nginx..."
sudo systemctl restart nginx

echo "Deployment Complete! Servers running."
