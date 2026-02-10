# Inventory Management CRM - Tent & Events Company

A complete web-based Inventory Management System built specifically for tent and events companies. Track inventory, manage projects, generate challans, and handle stock movements with ease.

## Features

### Core Functionality
- **Inventory Management**: Track all physical assets with categories, subcategories, and stock levels
- **Stock Movements**: Handle inward, outward, and return operations with automatic quantity updates
- **Project Tracking**: Manage events, camps, festivals, and corporate retreats
- **Challan Generation**: Create delivery notes with bundle template support and automatic stock deduction
- **Maintenance Tracking**: Auto-generate maintenance records for damaged or repair-needed items
- **Reports & Exports**: Comprehensive reports with CSV export functionality
- **Role-Based Access**: Three user roles with different permission levels

### Key Highlights
- **Transaction Safety**: All stock operations use Prisma transactions to prevent race conditions
- **Bundle Templates**: Auto-suggest linked items (e.g., tent + beds + lights) when creating challans
- **Audit Trail**: Complete history of who did what and when via stock movements
- **Print-Friendly Challans**: Browser-native print-to-PDF for delivery notes
- **Low Bandwidth Optimized**: Minimal data transfer, clean UI, suitable for low internet environments
- **Mobile Responsive**: Works on phones, tablets, and desktops

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with secure password hashing
- **Deployment Ready**: Production-ready code structure

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- npm or yarn package manager

### Installation Steps

1. **Clone the repository**
   ```bash
   cd crm-event-company
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/inventory_crm"

   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-super-secret-key-change-in-production"
   ```

   Replace the database credentials with your PostgreSQL connection string.

4. **Generate Prisma Client**
   ```bash
   npm run db:generate
   ```

5. **Run database migrations**
   ```bash
   npm run db:push
   ```

   Alternatively, for production:
   ```bash
   npm run db:migrate
   ```

6. **Seed the database with demo data**
   ```bash
   npm run db:seed
   ```

   This creates:
   - 3 demo users (admin, manager, viewer)
   - 4 categories (Tents, Furniture, Lighting, Electronics)
   - Multiple subcategories
   - Sample items with stock
   - 3 projects (planned, active, completed)
   - Stock movements
   - 1 challan
   - 1 bundle template

7. **Start the development server**
   ```bash
   npm run dev
   ```

8. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

### Demo Login Credentials

After seeding, use these credentials:

- **Admin**: `admin@example.com` / `admin123`
- **Inventory Manager**: `manager@example.com` / `manager123`
- **Viewer**: `viewer@example.com` / `viewer123`

## Project Structure

```
crm-event-company/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/               # NextAuth endpoints
│   │   ├── inventory/          # Inventory CRUD
│   │   ├── projects/           # Projects CRUD
│   │   ├── stock-movements/    # Stock operations
│   │   ├── challans/           # Challan generation
│   │   ├── bundle-templates/   # Bundle templates
│   │   ├── users/              # User management
│   │   └── reports/            # Reports & exports
│   ├── auth/                   # Login page
│   ├── dashboard/              # Main application
│   │   ├── inventory/          # Inventory management UI
│   │   ├── projects/           # Projects UI
│   │   ├── stock-movements/    # Stock movements UI
│   │   ├── challans/           # Challans UI with print view
│   │   ├── reports/            # Reports dashboard
│   │   └── users/              # User management UI
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Landing page
├── components/                 # Reusable UI components
│   ├── Header.tsx
│   └── Sidebar.tsx
├── lib/                        # Utilities and configurations
│   ├── prisma.ts               # Prisma client
│   ├── auth.ts                 # NextAuth configuration
│   └── permissions.ts          # Role-based permissions
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed script
├── types/                      # TypeScript type definitions
│   └── next-auth.d.ts
├── package.json
└── README.md
```

## Database Schema

### Core Models

- **User**: System users with roles (ADMIN, INVENTORY_MANAGER, VIEWER)
- **Category**: Inventory categories (e.g., Tents, Furniture)
- **Subcategory**: Optional subcategories
- **Item**: Physical inventory items with quantity and condition
- **Project**: Events, camps, festivals, etc.
- **StockMovement**: All inventory changes (INWARD, OUTWARD, RETURN)
- **Challan**: Delivery/dispatch notes
- **ChallanItem**: Items in each challan
- **BundleTemplate**: Templates for item bundles
- **BundleTemplateItem**: Items included in bundles
- **MaintenanceRecord**: Track repairs and damaged items

## Key Features Explained

### 1. Stock Movement System

All inventory changes are logged via `StockMovement`:

- **Inward**: Add new stock (purchase, returns from projects)
- **Outward**: Allocate to projects (deducts from available quantity)
- **Return**: Return items from projects (increases quantity, tracks condition)

All operations use Prisma transactions for data consistency.

### 2. Challan Generation with Bundles

When creating a challan:
1. Select a project
2. Choose base items (e.g., 10 Deluxe Tents)
3. System auto-suggests linked items via bundle templates
4. Review and adjust quantities
5. On confirmation:
   - Creates Challan record
   - Creates StockMovement (OUTWARD) for each item
   - Deducts from quantityAvailable
   - Generates unique challan number (CH-YYYY-XXX)

### 3. Role-Based Permissions

- **ADMIN**: Full access to everything including user management
- **INVENTORY_MANAGER**: Can manage inventory, projects, challans, stock movements
- **VIEWER**: Read-only access, can view reports and export data

Enforced at both API and UI levels.

### 4. Reports Module

Available reports:
- Current Stock Report (with total value calculation)
- Low Stock Alerts (items below threshold)
- Stock Movement Log (complete audit trail)
- Maintenance Pending (items needing repair)
- Project Allocation (items allocated to projects)
- Challan History

All reports support CSV export.

## Production Deployment

### 1. Environment Variables

Set these in your production environment:

```env
DATABASE_URL="your-production-postgres-url"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-a-strong-random-secret"
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

### 2. Build for Production

```bash
npm run build
npm start
```

### 3. Database Migrations

For production, use migrations instead of push:

```bash
npx prisma migrate deploy
```

### 4. Deployment Platforms

This app can be deployed to:
- **Vercel**: Easiest option, automatic deployments
- **Railway**: Great for full-stack apps with Postgres
- **Render**: Free tier available
- **DigitalOcean**: App Platform or Droplet
- **AWS**: EC2, ECS, or Amplify

## Security Considerations

- Passwords are hashed with bcrypt (10 salt rounds)
- All API routes check authentication
- Role-based permissions enforced server-side
- SQL injection prevented by Prisma
- CSRF protection via NextAuth

## Customization

### Adding New Categories

Use Prisma Studio:
```bash
npm run db:studio
```

Or add them programmatically via the API.

### Adding More Bundle Templates

Create bundle templates in the database or via Prisma Studio. Link base items with associated items and quantities.

### Changing Company Info

Edit the challan print view at:
```
app/dashboard/challans/[id]/print/page.tsx
```

Update company name, address, contact details.

## Troubleshooting

### Database Connection Issues

If you're experiencing login failures or seeing "Database connection failed" errors:

**📖 See the [Database Connection Troubleshooting Guide](database-connection-fix.md)** for detailed step-by-step solutions.

Quick checks:
- Verify your `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check network connectivity
- Review console logs for specific error messages

### Prisma Client Not Found

Run:
```bash
npm run db:generate
```

### Build Errors

Clear Next.js cache:
```bash
rm -rf .next
npm run build
```

### Session Issues

Clear cookies and regenerate `NEXTAUTH_SECRET`

## Support & Contributions

This is a production-ready system with clean, extensible code. Feel free to:
- Add more features (bundle CRUD UI, advanced analytics, etc.)
- Customize the UI/UX
- Integrate with external systems
- Add offline support using Service Workers

## License

MIT License - Free to use and modify for your business.

---

**Built with Next.js, Prisma, and TypeScript**

For questions or issues, refer to the code comments which explain key logic for stock updates, challan generation, and bundle templates.
