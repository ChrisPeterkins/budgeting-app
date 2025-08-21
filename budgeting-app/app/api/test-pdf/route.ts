import { NextRequest, NextResponse } from 'next/server'
// import { processPDFFile } from '@/lib/pdf-processing'
import jwt from 'jsonwebtoken'

// Test endpoint for debugging PDF processing
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET!)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Temporarily disabled for build
    return NextResponse.json({
      error: 'PDF processing test endpoint temporarily disabled'
    }, { status: 503 })

    // const { filePath, userId } = await request.json()
    
    // if (!filePath || !userId) {
    //   return NextResponse.json(
    //     { error: 'File path and user ID are required' },
    //     { status: 400 }
    //   )
    // }

    // console.log('Testing PDF processing for:', filePath)
    
    // const result = await processPDFFile(filePath, userId)

    // return NextResponse.json({
    //   success: true,
    //   result: {
    //     success: result.success,
    //     transactionsFound: result.transactionsFound,
    //     transactionsImported: result.transactionsImported,
    //     duplicates: result.duplicates,
    //     errors: result.errors
    //   }
    // })

  } catch (error) {
    console.error('Test PDF processing error:', error)
    return NextResponse.json(
      { error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}

// GET endpoint to show example patterns
export async function GET() {
  return NextResponse.json({
    message: 'PDF Processing Test Endpoint',
    supportedBanks: [
      'TD Bank',
      'Ally Bank',
      'Chase Bank',
      'Wells Fargo'
    ],
    samplePatterns: {
      'TD Bank': {
        dateFormat: 'MM/dd/yyyy',
        example: '12/25/2024 GROCERY STORE PURCHASE -$45.67'
      },
      'Ally Bank': {
        dateFormat: 'MM/dd/yyyy',
        example: '12/25/2024 ATM WITHDRAWAL -$20.00 $1,234.56'
      }
    },
    usage: 'POST with { filePath: string, userId: string }'
  })
} 