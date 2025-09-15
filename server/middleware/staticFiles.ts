import express from 'express'
import path from 'path'

// Middleware para servir arquivos estáticos locais
export const configureStaticFiles = (app: express.Express) => {
  // Servir uploads localmente em /uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
  
  console.log('✅ Static file serving configured: /uploads → ./uploads')
}