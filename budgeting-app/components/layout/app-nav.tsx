'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
// Temporarily disabled real-time features
// import { RealtimeStatus, RealtimeStatusMini } from '@/components/ui/realtime-status'
import { 
  Home, 
  DollarSign, 
  TrendingUp, 
  Target, 
  Upload, 
  Settings, 
  LogOut,
  BarChart3,
  CreditCard,
  Menu,
  X,
  Zap,
  Bell,
  User,
  ChevronDown,
  Search,
  Code,
  FileText,
  PieChart,
  Tags,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface NavItem {
  icon: any
  title: string
  href: string
  badge?: string
  description?: string
}

const navigationItems: NavItem[] = [
  { 
    icon: Home, 
    title: 'Dashboard', 
    href: '/dashboard',
    description: 'Overview and quick actions'
  },
  { 
    icon: DollarSign, 
    title: 'Transactions', 
    href: '/transactions',
    description: 'View and manage transactions'
  },
  { 
    icon: AlertCircle, 
    title: 'Review', 
    href: '/transactions/review',
    description: 'Review and categorize transactions',
    badge: 'Auto'
  },
  { 
    icon: CreditCard, 
    title: 'Accounts', 
    href: '/accounts',
    description: 'Bank accounts and balances'
  },
  { 
    icon: FileText, 
    title: 'Statements', 
    href: '/statements',
    description: 'Statement tracking and balances'
  },
  { 
    icon: Tags, 
    title: 'Categories', 
    href: '/categories',
    description: 'Transaction categories and analytics'
  },
  { 
    icon: TrendingUp, 
    title: 'Budgets', 
    href: '/budgets',
    description: 'Budget planning and tracking'
  },
  { 
    icon: Target, 
    title: 'Goals', 
    href: '/goals',
    description: 'Financial goals and milestones'
  },
  { 
    icon: BarChart3, 
    title: 'Analytics', 
    href: '/analytics',
    description: 'Insights and reports'
  },
]

const settingsItems: NavItem[] = [
  { 
    icon: Settings, 
    title: 'Settings', 
    href: '/settings',
    description: 'App preferences'
  },
  { 
    icon: Upload, 
    title: 'Upload Files', 
    href: '/uploads',
    description: 'Import bank statements'
  },
  { 
    icon: FileText, 
    title: 'File Manager', 
    href: '/file-manager',
    description: 'Manage uploaded files'
  },
  { 
    icon: PieChart, 
    title: 'Upload Stats', 
    href: '/upload-stats',
    description: 'File processing statistics'
  },
  { 
    icon: Code, 
    title: 'Dev Tools', 
    href: '/dev-tools',
    description: 'Development utilities',
    badge: 'Debug'
  },
  { 
    icon: Zap, 
    title: 'Real-time Demo', 
    href: '/realtime-demo',
    description: 'Live features showcase',
    badge: 'New'
  },
]

export function AppNav({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  // Debug logging
  useEffect(() => {
    console.log('AppNav mounted, current pathname:', pathname)
  }, [pathname])

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    router.push('/auth')
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const handleNavClick = (href: string, onItemClick?: () => void) => {
    console.log('Navigation clicked:', href)
    try {
      router.push(href)
      console.log('Router.push called successfully for:', href)
      if (onItemClick) {
        onItemClick()
        console.log('onItemClick called for:', href)
      }
    } catch (error) {
      console.error('Navigation error:', error)
    }
  }

  const NavItems = ({ mobile = false, onItemClick }: { mobile?: boolean, onItemClick?: () => void }) => (
    <div className="space-y-1">
      {/* Main Navigation */}
      <div className={`space-y-1 ${mobile ? 'px-2' : ''}`}>
        {navigationItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                console.log('Link clicked:', item.href)
                if (onItemClick) {
                  onItemClick()
                  console.log('Mobile menu closed for:', item.href)
                }
              }}
              className={`
                w-full group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-left no-underline block
                ${active 
                  ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100' 
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }
                ${mobile ? 'mx-0' : ''}
              `}
            >
              <Icon className={`
                mr-3 h-5 w-5 transition-colors
                ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}
              `} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span>{item.title}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                {mobile && item.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {item.description}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      <Separator className="my-4" />

      {/* Settings & Tools */}
      <div className={`space-y-1 ${mobile ? 'px-2' : ''}`}>
        <p className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Tools & Settings
        </p>
        {settingsItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                console.log('Settings link clicked:', item.href)
                if (onItemClick) {
                  onItemClick()
                  console.log('Mobile menu closed for settings:', item.href)
                }
              }}
              className={`
                w-full group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-left no-underline block
                ${active 
                  ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100' 
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }
              `}
            >
              <Icon className={`
                mr-3 h-5 w-5 transition-colors
                ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}
              `} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span>{item.title}</span>
                  {item.badge && (
                    <Badge variant="destructive" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                {mobile && item.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {item.description}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          {/* Left side - Logo and Mobile Menu */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Mobile Header */}
                  <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900 dark:text-white">Budget App</h2>
                        <p className="text-xs text-gray-500">Personal Finance</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mobile Navigation */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <NavItems mobile={true} onItemClick={() => setIsMobileMenuOpen(false)} />
                  </div>

                  {/* Mobile User Section */}
                  <div className="border-t p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar>
                        <AvatarFallback className="bg-blue-600 text-white">
                          {getInitials(user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user?.name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    {/* Temporarily disabled RealtimeStatus */}
                    {/* <RealtimeStatus 
                      enabledFeatures={{
                        enableBudgets: true,
                        enableGoals: true,
                        enableTransactions: true
                      }}
                      compact={true}
                    /> */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleLogout}
                      className="w-full mt-3"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Budget App
                </h1>
              </div>
            </Link>
          </div>

          {/* Center - Real-time Status (Desktop) - Temporarily disabled */}
          <div className="hidden md:block">
            {/* <RealtimeStatus 
              enabledFeatures={{
                enableBudgets: true,
                enableGoals: true,
                enableTransactions: true
              }}
              showRefreshButton={true}
              compact={false}
            /> */}
          </div>

          {/* Right side - User Menu */}
          <div className="flex items-center space-x-4">
            {/* Mobile Real-time Status - Temporarily disabled */}
            <div className="md:hidden">
              {/* <RealtimeStatusMini /> */}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-600 text-white text-sm">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.name || 'User'}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </Button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.email}
                    </p>
                  </div>
                  <div className="p-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => {
                        router.push('/settings')
                        setIsUserMenuOpen(false)
                      }}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleLogout}
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <nav className="hidden lg:flex lg:flex-shrink-0">
          <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
            <div className="h-full flex flex-col">
              {/* Navigation Content */}
              <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                <div className="px-3">
                  <NavItems />
                </div>
              </div>

              {/* Bottom User Section */}
              <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback className="bg-blue-600 text-white">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Click outside to close user menu */}
      {isUserMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </div>
  )
} 