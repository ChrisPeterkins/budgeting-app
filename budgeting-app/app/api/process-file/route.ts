import { NextRequest, NextResponse } from 'next/server'
import { processUploadedFile } from '@/lib/file-processing'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

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

    const { fileId } = await request.json()
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    // Process the file (run in background)
    processUploadedFile(fileId).catch(error => {
      console.error('Background file processing error:', error)
    })

    return NextResponse.json({
      success: true,
      message: 'File processing started'
    })

  } catch (error) {
    console.error('Process file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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

    const { fileId, action } = await request.json()
    
    if (!fileId || !action) {
      return NextResponse.json(
        { error: 'File ID and action are required' },
        { status: 400 }
      )
    }

    if (action === 'reset') {
      // Reset failed file back to PENDING status
      const updatedFile = await db.uploadedFile.update({
        where: { id: fileId },
        data: {
          status: 'PENDING',
          errorMessage: null,
          processedAt: null
        }
      })

      return NextResponse.json({
        success: true,
        message: 'File status reset to pending',
        file: updatedFile
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Reset file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 