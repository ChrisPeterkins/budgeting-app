import React from 'react'
import {
  Home,
  Car,
  ShoppingCart,
  Coffee,
  Gamepad2,
  Music,
  Dumbbell,
  Pill,
  Zap,
  Wifi,
  Smartphone,
  Laptop,
  Plane,
  Heart,
  GraduationCap,
  PiggyBank,
  CreditCard,
  Banknote,
  Target,
  TrendingUp,
  Gift,
  Shirt,
  Utensils,
  Film,
  Book,
  Wrench,
  Fuel,
  Building,
  DollarSign,
  Tag,
  Folder
} from 'lucide-react'

const ICON_MAP: { [key: string]: React.ComponentType<{ className?: string }> } = {
  'Home': Home,
  'Car': Car,
  'Shopping': ShoppingCart,
  'Coffee': Coffee,
  'Food': Utensils,
  'Games': Gamepad2,
  'Music': Music,
  'Entertainment': Film,
  'Fitness': Dumbbell,
  'Health': Pill,
  'Utilities': Zap,
  'Internet': Wifi,
  'Phone': Smartphone,
  'Tech': Laptop,
  'Travel': Plane,
  'Personal': Heart,
  'Education': GraduationCap,
  'Savings': PiggyBank,
  'Credit': CreditCard,
  'Cash': Banknote,
  'Goals': Target,
  'Investment': TrendingUp,
  'Gifts': Gift,
  'Clothing': Shirt,
  'Books': Book,
  'Maintenance': Wrench,
  'Gas': Fuel,
  'Business': Building,
  'Income': DollarSign,
  'Other': Tag,
}

interface CategoryIconProps {
  iconName?: string | null
  className?: string
  fallback?: React.ComponentType<{ className?: string }>
}

export function CategoryIcon({ 
  iconName, 
  className = "w-4 h-4", 
  fallback: Fallback = Folder 
}: CategoryIconProps) {
  if (!iconName) {
    return <Fallback className={className} />
  }

  const IconComponent = ICON_MAP[iconName]
  
  if (!IconComponent) {
    return <Fallback className={className} />
  }

  return <IconComponent className={className} />
} 