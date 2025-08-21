# Personal Budgeting App

A local-first budgeting application built for couples to manage their finances together. This app runs entirely on your computer with zero ongoing costs and complete data privacy.

## 🌟 Features

- **🏠 Local-First**: Runs entirely on your computer
- **💰 Zero Cost**: No monthly subscriptions or cloud fees
- **🔒 Complete Privacy**: Your data never leaves your computer
- **📊 Comprehensive Tracking**: Expenses, income, budgets, and goals
- **📁 Bank Statement Upload**: CSV import for transactions
- **📈 Analytics Dashboard**: Visual insights into spending patterns
- **👥 Multi-User**: Designed for couples (max 2 users)

## 🛠 Technology Stack

- **Frontend**: Next.js 15 with TypeScript
- **Backend**: tRPC for type-safe APIs
- **Database**: SQLite (local file)
- **UI**: Tailwind CSS + shadcn/ui
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts for analytics

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd budgeting-app
   npm install
   ```

2. **Set up the database:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
budgeting-app/
├── app/                    # Next.js App Router
│   ├── api/trpc/          # tRPC API routes
│   ├── providers.tsx      # React Query + tRPC providers
│   └── page.tsx           # Homepage
├── components/            # Reusable UI components
├── lib/                   # Utilities and configurations
│   ├── trpc/             # tRPC setup and routers
│   └── db.ts             # Database connection
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Initial data seeding
├── data/                 # Local data storage
│   ├── uploads/          # Uploaded files
│   ├── exports/          # Export files
│   ├── backups/          # Database backups
│   └── dev.db            # SQLite database
└── logs/                 # Application logs
```

## 🗄 Database Commands

```bash
# Push schema changes to database
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed database with initial data
npm run db:seed

# Reset database (caution: deletes all data)
npm run db:reset
```

## 🔧 Development

### Adding New Features

1. **Database Changes**: Update `prisma/schema.prisma`
2. **API Routes**: Add new routers in `lib/trpc/routers/`
3. **UI Components**: Create components in `components/`
4. **Pages**: Add new pages in `app/`

### Environment Variables

Create a `.env.local` file with:

```env
DATABASE_URL="file:./data/dev.db"
JWT_SECRET="your-super-secret-jwt-key"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 📦 Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🔐 Security Notes

- JWT tokens for local authentication
- All data stored locally in SQLite
- No external API calls except for development
- HTTPS recommended for production deployment

## 📊 Usage

1. **Register**: Create user accounts (max 2 users)
2. **Add Accounts**: Set up your bank accounts
3. **Upload Data**: Import bank statements (CSV)
4. **Set Budgets**: Create monthly/yearly budgets
5. **Track Goals**: Set financial goals and monitor progress
6. **Analyze**: Use the dashboard to understand spending patterns

## 🛡 Data Backup

Your data is stored in:
- Database: `data/dev.db`
- Uploads: `data/uploads/`
- Exports: `data/exports/`

**Recommended**: Regular backups of the entire `data/` folder.

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome!

## 📄 License

MIT License - feel free to modify for your own use.

---

**Note**: This application is designed for personal use by couples. For larger household management, consider adapting the user limits and permissions system.
