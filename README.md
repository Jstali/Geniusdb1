# GeniusDB - Data Visualization & Analysis Platform

A powerful full-stack data visualization and analysis platform with interactive maps, charts, pivot tables, and advanced data management capabilities.

## 🚀 Features

- **Interactive Data Visualization**: Charts, graphs, and pivot tables
- **Google Maps Integration**: Geospatial data visualization
- **Data Management**: Import, transform, and analyze large datasets
- **Performance Optimized**: Caching, pagination, and code splitting
- **Real-time Updates**: Live data synchronization
- **User Views**: Save and manage custom data views

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 1.29 or higher)
- **Git** (for cloning the repository)

### Installing Prerequisites

#### On Ubuntu/Debian:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

#### On macOS:
```bash
# Install Docker Desktop from https://www.docker.com/products/docker-desktop
# Docker Compose is included with Docker Desktop
```

#### On Windows:
- Download and install Docker Desktop from https://www.docker.com/products/docker-desktop
- Docker Compose is included with Docker Desktop

## 🛠️ Local Setup - Step by Step

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd Geniusdb1
```

### Step 2: Create Environment Configuration

Create a `.env` file in the root directory:

```bash
# Copy the template (or create manually)
cat > .env << 'EOF'
# Database Configuration
POSTGRES_DB=geniusdb
POSTGRES_USER=geniususer
POSTGRES_PASSWORD=changeme123

# Google Maps API Configuration
# Get your API key from: https://console.cloud.google.com/google/maps-apis
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Performance Settings
VITE_ENABLE_CACHING=true
VITE_CACHE_DURATION=300000
VITE_PAGINATION_SIZE=50

# Application Settings
ENVIRONMENT=development
DEBUG=true
EOF
```

### Step 3: Configure Google Maps API Key (Optional but Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Geocoding API
   - Places API
4. Create credentials (API Key)
5. Copy your API key and update the `.env` file:

```bash
VITE_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

### Step 4: Prepare Data Directory

The application expects data files in the `backend/data` directory. Create the directory structure:

```bash
mkdir -p backend/data
mkdir -p backend/uploads
```

Place your CSV data files in the `backend/data` directory for the application to process.

### Step 5: Start the Application

#### Option A: Using the Start Script (Recommended)

The easiest way to start the application:

```bash
# Make the script executable
chmod +x start.sh

# Run the start script
./start.sh
```

The script will:
- Check if Docker is running
- Create `.env` file if missing
- Build and start all services
- Perform health checks
- Display application URLs and status

#### Option B: Using Docker Compose Directly

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f
```

### Step 6: Verify Installation

After starting the application, verify all services are running:

```bash
# Check container status
docker-compose ps

# All containers should show "Up" status:
# - geniusdb_postgres
# - geniusdb_backend
# - geniusdb_frontend
```

### Step 7: Access the Application

Once all services are running, access the application:

- **Frontend Application**: http://localhost:5802
- **Backend API**: http://localhost:5801
- **API Documentation**: http://localhost:5801/docs
- **Health Check**: http://localhost:5801/health
- **PostgreSQL Database**: localhost:5800 (internal use)

## 📦 Service Details

### Frontend (React + Vite)
- **Port**: 5802
- **Technology**: React 18, Vite, TailwindCSS
- **Features**: AG Grid, ECharts, Google Maps, Plotly
- **Build Output**: Served via Nginx in production

### Backend (FastAPI)
- **Port**: 5801
- **Technology**: Python, FastAPI, Pandas
- **Database**: PostgreSQL
- **Features**: Data processing, API endpoints, CSV import

### Database (PostgreSQL)
- **Port**: 5800 (mapped from 5432)
- **Version**: PostgreSQL 15 Alpine
- **Default Credentials**:
  - Database: `geniusdb`
  - User: `geniususer`
  - Password: `changeme123`

## 🔧 Development Setup (Without Docker)

If you prefer to run services locally without Docker:

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL=postgresql://geniususer:changeme123@localhost:5432/geniusdb
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=geniusdb
export POSTGRES_USER=geniususer
export POSTGRES_PASSWORD=changeme123

# Start the backend server
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
# or
yarn install

# Create .env.local file
cat > .env.local << 'EOF'
VITE_API_BASE=http://localhost:8000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
EOF

# Start development server
npm run dev
# or
yarn dev
```

The frontend will be available at http://localhost:5173

### Database Setup

```bash
# Start PostgreSQL (if not using Docker)
# On Ubuntu/Debian:
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE geniusdb;
CREATE USER geniususer WITH PASSWORD 'changeme123';
GRANT ALL PRIVILEGES ON DATABASE geniusdb TO geniususer;
\q
```

## 📚 Common Commands

### Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild specific service
docker-compose up -d --build backend

# Execute command in container
docker-compose exec backend python -c "print('Hello')"

# Access database
docker-compose exec postgres psql -U geniususer -d geniusdb
```

### Application Commands

```bash
# Update application
git pull
docker-compose down
docker-compose up -d --build

# Clear all data and restart fresh
docker-compose down -v
docker-compose up -d --build

# Check disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

## 🐛 Troubleshooting

### Port Already in Use

If you get port conflict errors:

```bash
# Check what's using the port
sudo lsof -i :5802
sudo lsof -i :5801
sudo lsof -i :5800

# Stop the conflicting service or change ports in docker-compose.yml
```

### Services Not Starting

```bash
# Check logs for errors
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Database Connection Issues

```bash
# Check if PostgreSQL is healthy
docker-compose exec postgres pg_isready -U geniususer -d geniusdb

# Reset database
docker-compose down -v
docker-compose up -d postgres
# Wait for postgres to be ready, then start other services
docker-compose up -d backend frontend
```

### Frontend Build Issues

```bash
# Clear node_modules and rebuild
docker-compose exec frontend rm -rf node_modules package-lock.json
docker-compose exec frontend npm install
docker-compose restart frontend
```

### Google Maps Not Loading

1. Verify API key is set correctly in `.env`
2. Ensure the following APIs are enabled in Google Cloud Console:
   - Maps JavaScript API
   - Geocoding API
   - Places API
3. Check API key restrictions (if any)
4. Restart the frontend service: `docker-compose restart frontend`

## 🔒 Security Notes

### For Production Deployment:

1. **Change Default Passwords**: Update PostgreSQL credentials in `.env`
2. **API Keys**: Keep Google Maps API key secure, set domain restrictions
3. **CORS Configuration**: Update CORS settings in backend for production domain
4. **SSL/TLS**: Use HTTPS in production with valid certificates
5. **Environment Variables**: Never commit `.env` file to version control
6. **Database Backups**: Set up regular database backups

## 📊 Performance Optimization

The application includes several performance features:

- **Data Pagination**: Loads 50 items by default (configurable)
- **API Response Caching**: 5-minute cache duration
- **Code Splitting**: Optimized bundle sizes
- **Lazy Loading**: Components load on-demand
- **Database Indexing**: Optimized queries

### Monitoring Performance

Access the performance monitor in the application (📊 button) to track:
- API response times
- Page load times
- Memory usage
- Network requests

## 📁 Project Structure

```
Geniusdb1/
├── backend/                 # FastAPI backend
│   ├── app.py              # Main application
│   ├── database.py         # Database configuration
│   ├── data_manager.py     # Data processing
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile          # Backend Docker image
│   └── data/               # CSV data files
├── frontend/               # React frontend
│   ├── src/                # Source code
│   ├── public/             # Static assets
│   ├── package.json        # Node dependencies
│   ├── vite.config.js      # Vite configuration
│   └── Dockerfile          # Frontend Docker image
├── docker-compose.yml      # Docker orchestration
├── start.sh               # Quick start script
├── .env                   # Environment variables (create this)
└── README.md              # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review application logs: `docker-compose logs -f`
3. Check existing issues in the repository
4. Create a new issue with:
   - Error messages
   - Steps to reproduce
   - System information (OS, Docker version)
   - Relevant logs

## 📖 Additional Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions
- [Docker Setup](./DOCKER_SETUP.md) - Advanced Docker configuration
- [Performance Guide](./documentation/PERFORMANCE_OPTIMIZATION.md) - Performance tuning

---

**Built with ❤️ using React, FastAPI, and PostgreSQL**
