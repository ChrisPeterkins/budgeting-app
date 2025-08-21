# Personal Finance & Budgeting Application

A comprehensive personal finance management application built with Next.js, featuring PDF bank statement processing, real-time analytics, and budget tracking capabilities.

## Features

### Core Functionality
- **PDF Statement Processing**: Automatically extract and categorize transactions from bank statements
- **Multi-Account Support**: Manage multiple bank accounts in one place
- **Smart Categorization**: AI-powered automatic transaction categorization
- **Budget Management**: Create and track budgets with spending limits
- **Financial Goals**: Set and monitor savings goals
- **Real-time Analytics**: Interactive charts and financial health scoring

### Technical Features
- **Real-time Updates**: Live notifications and data synchronization
- **Dark Mode**: Full theme support for comfortable viewing
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Secure Authentication**: JWT-based authentication system
- **File Management**: Organized storage and processing of financial documents

## Tech Stack

- **Frontend**: Next.js 15.3, React 19, TypeScript
- **Styling**: Tailwind CSS v4, Radix UI components
- **Backend**: tRPC, Prisma ORM
- **Database**: SQLite (development), easily configurable for PostgreSQL/MySQL
- **Authentication**: JWT with bcrypt password hashing
- **File Processing**: PDF parsing with node-poppler
- **State Management**: React Query (Tanstack Query)
- **Charts**: Recharts for data visualization

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ChrisPeterkins/budgeting-app.git
cd budgeting-app
```

2. Navigate to the application directory:
```bash
cd budgeting-app
```

3. Install dependencies:
```bash
npm install
```

4. Set up the database:
```bash
npm run db:push
npm run db:seed  # Optional: adds sample data
```

5. Create a `.env.local` file with required environment variables:
```env
JWT_SECRET=your-secret-key-here
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Getting Started with the App

1. **Create an Account**: Sign up with email and password
2. **Add Bank Account**: Navigate to Accounts page and add your bank details
3. **Upload Statements**: Use the Upload page to process PDF bank statements
4. **Review Transactions**: Check and categorize imported transactions
5. **Set Budgets**: Create monthly budgets for different spending categories
6. **Track Goals**: Set financial goals and monitor progress
7. **View Analytics**: Access insights through the Analytics dashboard

### Key Pages

- **/dashboard** - Overview of finances and recent activity
- **/uploads** - PDF statement upload and processing
- **/transactions** - View and manage all transactions
- **/budgets** - Create and monitor spending budgets
- **/analytics** - Financial insights and trends
- **/accounts** - Manage bank accounts
- **/categories** - Customize transaction categories
- **/goals** - Financial goal tracking

## Project Structure

```
budgeting-app/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes and tRPC endpoints
│   ├── dashboard/         # Dashboard page
│   ├── transactions/      # Transaction management
│   ├── budgets/          # Budget tracking
│   └── ...               # Other feature pages
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── analytics/        # Analytics visualizations
│   ├── uploads/          # File upload components
│   └── ...              # Feature-specific components
├── lib/                  # Utility functions and configurations
│   ├── trpc/            # tRPC routers and client
│   ├── hooks/           # Custom React hooks
│   └── ...              # Helper functions
├── prisma/              # Database schema and migrations
├── public/              # Static assets
└── data/                # File storage (gitignored)
```

## Available Scripts

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate Prisma client
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset and reseed database
```

## Database Schema

The application uses Prisma ORM with the following main entities:

- **User**: User accounts and authentication
- **Account**: Bank accounts linked to users
- **Transaction**: Financial transactions
- **Category**: Transaction categories
- **Budget**: Budget definitions and limits
- **Goal**: Financial goals and progress
- **Statement**: Uploaded bank statements
- **ProcessedFile**: File processing tracking

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Secure file upload validation
- SQL injection prevention via Prisma
- XSS protection through React
- CSRF protection in forms

## Development Tips

### Adding New Features
1. Create new tRPC router in `lib/trpc/routers/`
2. Add corresponding pages in `app/` directory
3. Create reusable components in `components/`
4. Update Prisma schema if needed and run migrations

### Testing PDF Processing
Sample bank statements are available in `data/sample-statements/` for testing the PDF processing functionality.

### Customizing Categories
Default categories are defined in `lib/auto-categorization.ts` and can be customized to match your needs.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is private and proprietary.

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js and modern web technologies