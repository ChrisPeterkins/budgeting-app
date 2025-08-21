import { Building } from 'lucide-react'

interface BankLogoProps {
  bankName: string
  size?: number
  className?: string
}

// Bank logo mappings using simple colored backgrounds with bank initials
const getBankLogo = (bankName: string) => {
  const name = bankName.toLowerCase()
  
  if (name.includes('td bank') || name.includes('td')) {
    return { initial: 'TD', bg: 'bg-green-600', text: 'text-white' }
  }
  if (name.includes('chase')) {
    return { initial: 'CH', bg: 'bg-blue-600', text: 'text-white' }
  }
  if (name.includes('bank of america') || name.includes('boa')) {
    return { initial: 'BA', bg: 'bg-red-600', text: 'text-white' }
  }
  if (name.includes('wells fargo')) {
    return { initial: 'WF', bg: 'bg-yellow-600', text: 'text-white' }
  }
  if (name.includes('ally')) {
    return { initial: 'AL', bg: 'bg-purple-600', text: 'text-white' }
  }
  if (name.includes('capital one')) {
    return { initial: 'C1', bg: 'bg-red-500', text: 'text-white' }
  }
  if (name.includes('citi') || name.includes('citibank')) {
    return { initial: 'CI', bg: 'bg-blue-500', text: 'text-white' }
  }
  if (name.includes('discover')) {
    return { initial: 'DI', bg: 'bg-orange-600', text: 'text-white' }
  }
  if (name.includes('american express') || name.includes('amex')) {
    return { initial: 'AX', bg: 'bg-blue-800', text: 'text-white' }
  }
  if (name.includes('us bank') || name.includes('usbank')) {
    return { initial: 'US', bg: 'bg-red-700', text: 'text-white' }
  }
  
  // Default for unknown banks
  const initials = bankName
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
  
  return { initial: initials || 'BK', bg: 'bg-gray-500', text: 'text-white' }
}

export function BankLogo({ bankName, size = 8, className = '' }: BankLogoProps) {
  if (!bankName) {
    return (
      <div className={`w-${size} h-${size} bg-gray-200 rounded-full flex items-center justify-center ${className}`}>
        <Building className="w-4 h-4 text-gray-400" />
      </div>
    )
  }

  const logo = getBankLogo(bankName)

  return (
    <div 
      className={`w-${size} h-${size} ${logo.bg} ${logo.text} rounded-full flex items-center justify-center font-semibold text-xs ${className}`}
      title={bankName}
    >
      {logo.initial}
    </div>
  )
} 