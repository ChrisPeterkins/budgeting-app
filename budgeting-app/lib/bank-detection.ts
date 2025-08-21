// Common bank detection utilities

export interface BankInfo {
  name: string
  type: 'TD_BANK' | 'ALLY_BANK' | 'CHASE' | 'WELLS_FARGO' | 'GENERIC'
  confidence: number // 0-100
}

export const BANK_IDENTIFIERS = {
  TD_BANK: {
    name: 'TD Bank',
    indicators: ['TD Bank', 'TD BANK', 'Toronto-Dominion', 'td.com', 'TD Canada Trust'],
    strongIndicators: ['TD Bank', 'Toronto-Dominion Bank']
  },
  ALLY_BANK: {
    name: 'Ally Bank',
    indicators: ['Ally Bank', 'ALLY BANK', 'ally.com', 'Ally Financial', 'GMAC Bank'],
    strongIndicators: ['Ally Bank', 'Ally Financial Inc']
  },
  CHASE: {
    name: 'Chase Bank',
    indicators: ['Chase', 'CHASE', 'JPMorgan Chase', 'chase.com', 'J.P. Morgan'],
    strongIndicators: ['JPMorgan Chase Bank', 'Chase Bank']
  },
  WELLS_FARGO: {
    name: 'Wells Fargo',
    indicators: ['Wells Fargo', 'WELLS FARGO', 'wellsfargo.com', 'Wells Fargo Bank'],
    strongIndicators: ['Wells Fargo Bank', 'Wells Fargo & Company']
  }
} as const

export function detectBank(text: string): BankInfo {
  const upperText = text.toUpperCase()
  let bestMatch: BankInfo = {
    name: 'Generic Bank',
    type: 'GENERIC',
    confidence: 0
  }

  for (const [bankKey, bank] of Object.entries(BANK_IDENTIFIERS)) {
    let confidence = 0
    
    // Check strong indicators (high confidence)
    for (const strongIndicator of bank.strongIndicators) {
      if (upperText.includes(strongIndicator.toUpperCase())) {
        confidence += 40
      }
    }
    
    // Check regular indicators (medium confidence)
    for (const indicator of bank.indicators) {
      if (upperText.includes(indicator.toUpperCase())) {
        confidence += 15
      }
    }
    
    // Bonus for multiple matches
    const matchCount = bank.indicators.filter(indicator => 
      upperText.includes(indicator.toUpperCase())
    ).length
    
    if (matchCount > 1) {
      confidence += 10
    }
    
    // Cap confidence at 100
    confidence = Math.min(confidence, 100)
    
    if (confidence > bestMatch.confidence) {
      bestMatch = {
        name: bank.name,
        type: bankKey as keyof typeof BANK_IDENTIFIERS,
        confidence
      }
    }
  }

  return bestMatch
}

export function getBankDisplayInfo(bankType: string) {
  switch (bankType) {
    case 'TD_BANK':
      return { name: 'TD Bank', color: 'bg-green-100 text-green-800', emoji: '🏦' }
    case 'ALLY_BANK':
      return { name: 'Ally Bank', color: 'bg-purple-100 text-purple-800', emoji: '🏛️' }
    case 'CHASE':
      return { name: 'Chase', color: 'bg-blue-100 text-blue-800', emoji: '🏢' }
    case 'WELLS_FARGO':
      return { name: 'Wells Fargo', color: 'bg-red-100 text-red-800', emoji: '🏪' }
    default:
      return { name: 'Bank Statement', color: 'bg-gray-100 text-gray-800', emoji: '📄' }
  }
} 