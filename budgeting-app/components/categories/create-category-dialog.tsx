'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Plus, 
  FolderPlus, 
  Tag,
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
  DollarSign
} from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'

interface CreateCategoryDialogProps {
  onCategoryCreated?: (category: any) => void
  trigger?: React.ReactNode
  parentCategoryId?: string
}

const CATEGORY_COLORS = [
  '#ef4444', // red
  '#f97316', // orange  
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
  '#0891b2', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
]

const CATEGORY_ICONS = [
  { icon: Home, name: 'Home' },
  { icon: Car, name: 'Car' },
  { icon: ShoppingCart, name: 'Shopping' },
  { icon: Coffee, name: 'Coffee' },
  { icon: Utensils, name: 'Food' },
  { icon: Gamepad2, name: 'Games' },
  { icon: Music, name: 'Music' },
  { icon: Film, name: 'Entertainment' },
  { icon: Dumbbell, name: 'Fitness' },
  { icon: Pill, name: 'Health' },
  { icon: Zap, name: 'Utilities' },
  { icon: Wifi, name: 'Internet' },
  { icon: Smartphone, name: 'Phone' },
  { icon: Laptop, name: 'Tech' },
  { icon: Plane, name: 'Travel' },
  { icon: Heart, name: 'Personal' },
  { icon: GraduationCap, name: 'Education' },
  { icon: PiggyBank, name: 'Savings' },
  { icon: CreditCard, name: 'Credit' },
  { icon: Banknote, name: 'Cash' },
  { icon: Target, name: 'Goals' },
  { icon: TrendingUp, name: 'Investment' },
  { icon: Gift, name: 'Gifts' },
  { icon: Shirt, name: 'Clothing' },
  { icon: Book, name: 'Books' },
  { icon: Wrench, name: 'Maintenance' },
  { icon: Fuel, name: 'Gas' },
  { icon: Building, name: 'Business' },
  { icon: DollarSign, name: 'Income' },
  { icon: Tag, name: 'Other' }
]

export function CreateCategoryDialog({ 
  onCategoryCreated, 
  trigger,
  parentCategoryId 
}: CreateCategoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0])
  const [selectedIcon, setSelectedIcon] = useState(CATEGORY_ICONS[0])

  const { data: categories } = api.categories.getAll.useQuery()
  const createCategoryMutation = api.categories.create.useMutation()

  const parentCategories = categories?.filter(cat => !cat.parentId) || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!categoryName.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      const newCategory = await createCategoryMutation.mutateAsync({
        name: categoryName.trim(),
        color: selectedColor,
        icon: selectedIcon.name,
        parentId: parentCategoryId,
      })

      toast.success(`Category "${newCategory.name}" created successfully!`)
      
      // Reset form
      setCategoryName('')
      setSelectedColor(CATEGORY_COLORS[0])
      setSelectedIcon(CATEGORY_ICONS[0])
      setOpen(false)

      // Notify parent component
      onCategoryCreated?.(newCategory)
      
    } catch (error) {
      toast.error('Failed to create category')
      console.error('Create category error:', error)
    }
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Plus className="w-4 h-4 mr-2" />
      Add Custom Category
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FolderPlus className="w-5 h-5 mr-2" />
            Create Custom Category
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="category-name">Category Name</Label>
            <Input
              id="category-name"
              placeholder="e.g., Pet Supplies, Hobbies, etc."
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="mt-1"
              maxLength={50}
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Choose an Icon</Label>
            <div className="grid grid-cols-6 gap-2 mt-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
              {CATEGORY_ICONS.map((iconData, index) => {
                const IconComponent = iconData.icon
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedIcon(iconData)}
                    className={`p-3 rounded-lg border-2 hover:bg-gray-50 transition-colors flex flex-col items-center space-y-1 ${
                      selectedIcon.name === iconData.name
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200'
                    }`}
                    title={iconData.name}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="text-xs text-gray-600">{iconData.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Choose a Color</Label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full border-2 hover:scale-110 transition-transform ${
                    selectedColor === color 
                      ? 'border-gray-800 scale-110' 
                      : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {parentCategoryId && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center text-sm text-blue-800">
                <Tag className="w-4 h-4 mr-2" />
                This will be created as a subcategory
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <Label className="text-sm font-medium text-gray-700">Preview</Label>
              <div className="flex items-center space-x-3 mt-2">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: selectedColor }}
                >
                  <selectedIcon.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium">
                    {categoryName.trim() || 'Category Name'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedIcon.name} icon
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={createCategoryMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!categoryName.trim() || createCategoryMutation.isPending}
            >
              {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 