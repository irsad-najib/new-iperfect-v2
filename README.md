# iPerfect v2.0 - Tailwind Edition

Modern web application built with Next.js 16, React 19, Tailwind CSS 4, and Ant Design.

## 🚀 Tech Stack

- **Framework:** Next.js 16.0.7 with App Router
- **UI Library:** React 19.2.0
- **Styling:** Tailwind CSS 4 + Ant Design 6
- **Language:** TypeScript 5
- **State Management:** React Context API
- **HTTP Client:** Axios
- **Icons:** React Icons
- **Compiler:** React Compiler (Babel Plugin)

## 📋 Prerequisites

- Node.js 18.x or higher
- npm, yarn, or pnpm

## 🛠️ Installation

1. Clone the repository

```bash
git clone <repository-url>
cd iperfect-v2_tailwind
```

2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and configure your API base URL:

```env
NEXT_PUBLIC_API_BASE_URL=http://iperfect-api.479067.my.id
```

## 🏃‍♂️ Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Build

Create a production build:

```bash
npm run build
# or
yarn build
# or
pnpm build
```

Start the production server:

```bash
npm run start
# or
yarn start
# or
pnpm start
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── component/             # React components
│   ├── layout/           # Layout components (Sidebar, ClientLayout)
│   └── login/            # Login components
├── config/               # Configuration files
│   └── menuConfig.tsx    # Sidebar menu configuration
├── constants/            # Application constants
│   └── index.ts          # Global constants
├── context/              # React Context providers
│   ├── AuthContext.tsx   # Authentication context
│   └── DateContext.tsx   # Date selection context
├── hooks/                # Custom React hooks
│   ├── useAuth.ts        # Authentication hook
│   └── useSidebar.ts     # Sidebar state management hook
├── lib/                  # External libraries integration
├── types/                # TypeScript type definitions
│   └── index.ts          # Global types
├── utils/                # Utility functions
│   ├── auth.ts           # Authentication utilities
│   ├── axios.ts          # Axios configuration
│   └── helpers.ts        # Helper functions
└── theme.ts              # Ant Design theme configuration
```

## ⚡ Performance Optimizations

- **React Compiler:** Enabled for automatic optimizations
- **SWC Minification:** Faster builds and smaller bundles
- **Dynamic Imports:** Code splitting for better initial load
- **Image Optimization:** AVIF and WebP support
- **Package Optimization:** Automatic tree-shaking for antd and react-icons
- **TypeScript Strict Mode:** Better type safety and error detection

## 🔐 Authentication

The application uses JWT-based authentication with:

- API key stored in cookies
- Encrypted access tokens in localStorage/sessionStorage
- Automatic token refresh on 401 responses
- Protected routes based on user permissions

## 🎨 Styling

- **Tailwind CSS 4:** Utility-first CSS framework
- **Ant Design 6:** Pre-built UI components
- **Custom Theme:** Configured in `src/theme.ts`
- **Responsive Design:** Mobile-first approach

## 📱 Features

- Daily Routines Management
- Process Tracking (Input Data, Cleansing, Tie In)
- NPK Production Data
- Boiler Batubara Monitoring
- Reporting System
- Global Configuration
- Real-time Notifications (SSE)

## 🧪 Code Quality

- ESLint configured with Next.js recommended rules
- TypeScript strict mode enabled
- Unused variables and parameters warnings
- Consistent casing enforcement

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and type checking
4. Submit a pull request

## 📄 License

Private - All rights reserved

## 👥 Team

iPerfect Development Team
# new-iperfect-v2
