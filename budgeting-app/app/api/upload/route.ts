import { NextRequest, NextResponse } from 'next/server'
import { validateFile, generateUniqueFilename, saveUploadedFile } from '@/lib/upload-utils'
import { db } from '@/lib/db'
import { FileStatus } from '@prisma/client'
import { processUploadedFile } from '@/lib/file-processing'
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

    let userId: string
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
      userId = decoded.userId
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const accountId = formData.get('accountId') as string || null
    const bankName = formData.get('bankName') as string || null
    const accountType = formData.get('accountType') as string || 'CHECKING'
    const statementType = formData.get('statementType') as string || 'MONTHLY'
    
    console.log('=== UPLOAD API DEBUG ===')
    console.log('Form data received:')
    console.log('- File:', file ? `${file.name} (${file.size} bytes, ${file.type})` : 'No file')
    console.log('- Account ID:', accountId)
    console.log('- Bank Name:', bankName)
    console.log('- Account Type:', accountType)
    console.log('- Statement Type:', statementType)
    console.log('Raw form data keys:', Array.from(formData.keys()))
    formData.forEach((value, key) => {
      if (key !== 'file') {
        console.log(`- FormData[${key}]:`, value)
      }
    })
    console.log('=========================')
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    if (!file.name || file.name === 'undefined') {
      return NextResponse.json(
        { error: 'Invalid file name' },
        { status: 400 }
      )
    }

    // Validate file
    const validation = validateFile(file)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Generate unique filename
    const filename = generateUniqueFilename(file.name)

    // Save file to local storage
    const saveResult = await saveUploadedFile(file, filename)
    
    if (!saveResult.success) {
      return NextResponse.json(
        { error: saveResult.error || 'Failed to save file' },
        { status: 500 }
      )
    }

    // Save upload record to database
    try {
      const uploadRecord = await db.uploadedFile.create({
        data: {
          filename,
          originalName: file.name,
          filePath: saveResult.filePath!,
          fileSize: file.size,
          status: FileStatus.PENDING,
          accountId: accountId || undefined,
          bankName: bankName || undefined,
          accountType: accountType,
          statementType,
        } as any,
      })

      console.log('=== DATABASE SAVE DEBUG ===')
      console.log('Data being saved to database:')
      console.log('- accountId:', accountId || undefined)
      console.log('- bankName:', bankName || undefined)
      console.log('- accountType:', accountType)
      console.log('- statementType:', statementType)
      console.log('Created upload record:', {
        id: uploadRecord.id,
        accountId: (uploadRecord as any).accountId,
        bankName: (uploadRecord as any).bankName,
        accountType: (uploadRecord as any).accountType,
        statementType: (uploadRecord as any).statementType
      })
      console.log('============================')

      console.log(`File uploaded successfully: ${uploadRecord.id}, starting automatic processing...`)

      // Automatically start processing the file in the background
      processUploadedFile(uploadRecord.id).catch(error => {
        console.error('Automatic file processing error:', error)
        // Update file status to FAILED if processing fails
        db.uploadedFile.update({
          where: { id: uploadRecord.id },
          data: {
            status: FileStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : 'Processing failed',
            processedAt: new Date()
          }
        }).catch(dbError => {
          console.error('Failed to update file status to FAILED:', dbError)
        })
      })

      return NextResponse.json({
        success: true,
        message: 'File uploaded successfully and processing started automatically',
        upload: {
          id: uploadRecord.id,
          filename: uploadRecord.filename,
          originalName: uploadRecord.originalName,
          fileSize: uploadRecord.fileSize,
          status: uploadRecord.status,
          createdAt: uploadRecord.createdAt,
        },
      })
    } catch (dbError) {
      // If database save fails, clean up the uploaded file
      await import('@/lib/upload-utils').then(utils => 
        utils.deleteFile(saveResult.filePath!)
      )
      
      console.error('Database error saving upload record:', dbError)
      return NextResponse.json(
        { error: 'Failed to save upload record' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve upload status
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    let userId: string
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
      userId = decoded.userId
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as FileStatus | null
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const whereClause: any = {}
    if (status) {
      whereClause.status = status
    }

    // Get uploads
    const uploads = await db.uploadedFile.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const totalCount = await db.uploadedFile.count({ where: whereClause })

    return NextResponse.json({
      uploads,
      totalCount,
      hasMore: offset + limit < totalCount,
    })

  } catch (error) {
    console.error('Get uploads error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to remove uploaded file
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    let userId: string
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
      userId = decoded.userId
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get file ID from query parameters
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('id')
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    // Get upload record
    const upload = await db.uploadedFile.findUnique({
      where: { id: fileId }
    })

    if (!upload) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Delete file from storage
    const { deleteFile } = await import('@/lib/upload-utils')
    await deleteFile(upload.filePath)

    // Delete database record
    await db.uploadedFile.delete({
      where: { id: fileId }
    })

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    })

  } catch (error) {
    console.error('Delete file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 