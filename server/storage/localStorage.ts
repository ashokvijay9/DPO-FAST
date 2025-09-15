import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export class LocalStorageService {
  private uploadsDir = 'uploads'
  private documentsDir = path.join(this.uploadsDir, 'documents')

  constructor() {
    this.ensureDirectories()
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true })
      await fs.mkdir(this.documentsDir, { recursive: true })
    } catch (error) {
      console.error('Error creating upload directories:', error)
    }
  }

  async uploadFile(file: Buffer, fileName: string, contentType: string, folder?: string): Promise<string> {
    const fileExtension = path.extname(fileName)
    const baseName = path.basename(fileName, fileExtension)
    const uniqueFileName = `${baseName}_${uuidv4()}${fileExtension}`
    
    const uploadPath = folder 
      ? path.join(this.documentsDir, folder)
      : this.documentsDir
    
    // Garantir que o diretório existe
    await fs.mkdir(uploadPath, { recursive: true })
    
    const filePath = path.join(uploadPath, uniqueFileName)
    
    try {
      await fs.writeFile(filePath, file)
      
      // Retornar caminho relativo para storage
      const relativePath = folder 
        ? path.join(folder, uniqueFileName)
        : uniqueFileName
        
      return relativePath
    } catch (error) {
      throw new Error(`Failed to upload file: ${error}`)
    }
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.documentsDir, filePath)
    
    try {
      const file = await fs.readFile(fullPath)
      return file
    } catch (error) {
      throw new Error(`Failed to download file: ${error}`)
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.documentsDir, filePath)
    
    try {
      await fs.unlink(fullPath)
    } catch (error) {
      throw new Error(`Failed to delete file: ${error}`)
    }
  }

  async getFilePath(filePath: string): Promise<string> {
    return path.join(this.documentsDir, filePath)
  }

  async listFiles(folder?: string): Promise<Array<{ name: string; size: number; updated_at: string }>> {
    const searchPath = folder 
      ? path.join(this.documentsDir, folder)
      : this.documentsDir
    
    try {
      const files = await fs.readdir(searchPath)
      const fileDetails = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(searchPath, file)
          const stats = await fs.stat(filePath)
          
          return {
            name: file,
            size: stats.size,
            updated_at: stats.mtime.toISOString()
          }
        })
      )
      
      return fileDetails
    } catch (error) {
      throw new Error(`Failed to list files: ${error}`)
    }
  }

  // Método para servir arquivos via HTTP
  getPublicUrl(filePath: string): string {
    return `/uploads/documents/${filePath}`
  }
}

export const localStorageService = new LocalStorageService()