# AI-Powered Inventory Management System

A modern, full-stack inventory management application with AI-powered stock depletion predictions. Built with React TypeScript frontend and Node.js backend with SQLite database.

## 🚀 Features

### ✅ Completed Features
- **Real-time Inventory Management**: Add, update, delete, and track inventory items
- **AI Stock Predictions**: Machine learning algorithms predict when items will run out
- **Interactive Dashboard**: Visual charts and statistics for inventory insights
- **File Upload System**: Import sales and inventory data via CSV/JSON files
- **Advanced Filtering**: Search and filter inventory by category, status, and more
- **Responsive Design**: Modern UI with dark mode support using shadcn/ui
- **RESTful API**: Complete backend API with proper error handling
- **Data Persistence**: SQLite database with proper schema and relationships

### 🧠 AI Prediction Logic
- **Moving Average Analysis**: Calculates sales velocity trends
- **Linear Regression**: Identifies sales patterns and seasonality
- **Confidence Scoring**: Provides reliability metrics for predictions
- **Automatic Alerts**: Notifies when items reach critical stock levels

## 🏗️ Architecture

### Frontend (React TypeScript)
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **TanStack Query** for data fetching and caching
- **shadcn/ui** component library with Tailwind CSS
- **Recharts** for data visualizations
- **React Hook Form** with Zod validation

### Backend (Node.js)
- **Express.js** REST API server
- **SQLite** database with comprehensive schema
- **Multer** for file upload handling
- **Custom AI prediction algorithms**
- **Comprehensive error handling and validation**

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- npm or bun package manager

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The backend will start on http://localhost:3001

### Frontend Setup
```bash
cd frontend
npm install
# or if using bun
bun install

cp .env.example .env
npm run dev
# or if using bun
bun run dev
```

The frontend will start on http://localhost:8080

## 🗄️ Database Schema

### Tables
- **inventory_items**: Core inventory data with stock levels
- **sales_data**: Historical sales transactions
- **stock_movements**: Inventory adjustments and transfers
- **predictions**: AI-generated stock predictions
- **alerts**: System-generated alerts for low stock

## 📊 API Endpoints

### Inventory Management
- `GET /api/inventory` - Get all inventory items (with pagination/filtering)
- `GET /api/inventory/:id` - Get single inventory item
- `POST /api/inventory` - Create new inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item
- `GET /api/inventory/stats/overview` - Get inventory statistics

### Predictions
- `POST /api/predictions/generate` - Generate AI predictions for all items
- `GET /api/predictions/item/:id` - Get predictions for specific item
- `GET /api/predictions/chart/:id` - Get chart data for item predictions
- `GET /api/predictions/alerts/low-stock` - Get low stock alerts

### File Upload
- `POST /api/upload/sales-data` - Upload sales data (CSV/JSON)
- `POST /api/upload/inventory-data` - Upload inventory data (CSV/JSON)
- `GET /api/upload/sample-format/:type` - Get sample file formats

## 🎯 Usage Examples

### Upload Sales Data
Upload a CSV file with columns:
```csv
item_name,item_category,quantity_sold,sale_date,unit_price
Premium Headphones,Electronics,2,2024-01-15,149.99
Coffee Beans,Food & Beverage,5,2024-01-15,16.99
```

### Upload Inventory Data
Upload a CSV file with columns:
```csv
name,category,current_stock,reorder_point,unit_cost,selling_price,supplier,location
Premium Headphones,Electronics,45,20,75.00,149.99,TechCorp,Warehouse A
```

## 🔧 Configuration

### Backend Environment Variables (.env)
```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:8080
DATABASE_PATH=./data/inventory.db
```

### Frontend Environment Variables (.env)
```env
VITE_API_URL=http://localhost:3001/api
```

## 🚀 Production Deployment

### Backend Deployment
1. Set NODE_ENV=production
2. Configure production database
3. Set up process manager (PM2)
4. Configure reverse proxy (nginx)

### Frontend Deployment
1. Build the application: `npm run build`
2. Serve static files from `dist/` directory
3. Configure environment variables for production API

## 🧪 Testing

### Test the API
```bash
# Health check
curl http://localhost:3001/health

# Get inventory items
curl http://localhost:3001/api/inventory

# Generate predictions
curl -X POST http://localhost:3001/api/predictions/generate
```

## 📈 Performance Features
- **Query Optimization**: Indexed database queries for fast retrieval
- **Data Caching**: Frontend caching with TanStack Query
- **Lazy Loading**: Components and data loaded on demand
- **Optimistic Updates**: Immediate UI feedback for better UX

## 🔮 Future Enhancements
- [ ] Advanced ML models (LSTM, ARIMA)
- [ ] Multi-location inventory tracking
- [ ] Supplier integration APIs
- [ ] Mobile application
- [ ] Real-time notifications
- [ ] Advanced analytics and reporting
- [ ] User authentication and roles
- [ ] Audit trail and version history

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License
MIT License - feel free to use this project for learning or commercial purposes.

---

**Built with ❤️ using modern web technologies**
