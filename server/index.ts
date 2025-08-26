import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // Set NODE_ENV to production for deployment if not already set
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'production';
    }

    // Check environment - use NODE_ENV directly instead of app.get("env")
    // This ensures proper production behavior during deployment
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      log('Running in production mode - serving static files');
      serveStatic(app);
    } else {
      log('Running in development mode - setting up Vite');
      await setupVite(app, server);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    
    // Add error handling for server startup
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port} in ${process.env.NODE_ENV} mode`);
    });

    // Handle server errors
    server.on('error', (err: Error) => {
      log(`Server error: ${err.message}`);
      console.error('Server startup error:', err);
      process.exit(1);
    });

  } catch (error) {
    log(`Application failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Application initialization error:', error);
    process.exit(1);
  }
})();
