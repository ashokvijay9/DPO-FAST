import { createClient } from '@supabase/supabase-js'

// Force correct Supabase URL - environment variables contain wrong IP
const supabaseUrl = 'https://vrhukcxtfjnzvmbqhbzt.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Admin client for server-side storage operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export class SupabaseStorageService {
  private bucket = 'documents'

  async uploadFile(file: Buffer, fileName: string, contentType: string, folder?: string): Promise<string> {
    const filePath = folder ? `${folder}/${fileName}` : fileName
    
    const { data, error } = await supabaseAdmin.storage
      .from(this.bucket)
      .upload(filePath, file, {
        contentType,
        upsert: true
      })

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`)
    }

    return data.path
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    const { data, error } = await supabaseAdmin.storage
      .from(this.bucket)
      .download(filePath)

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`)
    }

    return Buffer.from(await data.arrayBuffer())
  }

  async deleteFile(filePath: string): Promise<void> {
    const { error } = await supabaseAdmin.storage
      .from(this.bucket)
      .remove([filePath])

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`)
    }
  }

  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabaseAdmin.storage
      .from(this.bucket)
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`)
    }

    return data.signedUrl
  }

  async listFiles(folder?: string): Promise<Array<{ name: string; size: number; updated_at: string }>> {
    const { data, error } = await supabaseAdmin.storage
      .from(this.bucket)
      .list(folder)

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`)
    }

    return data?.map(file => ({
      name: file.name,
      size: file.metadata?.size ?? 0,
      updated_at: file.updated_at || new Date().toISOString()
    })) || []
  }

  // Create bucket if it doesn't exist
  async ensureBucket(): Promise<void> {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    
    const bucketExists = buckets?.some(bucket => bucket.name === this.bucket)
    
    if (!bucketExists) {
      const { error } = await supabaseAdmin.storage.createBucket(this.bucket, {
        public: false,
        allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*']
      })
      
      if (error) {
        throw new Error(`Failed to create bucket: ${error.message}`)
      }
    }
  }
}

export const supabaseStorage = new SupabaseStorageService()