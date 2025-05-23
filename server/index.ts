import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Enable Firestore in production or when explicitly configured
process.env.USE_FIRESTORE = process.env.USE_FIRESTORE || 'true';

const app = express();

// Enable CORS for development with credentials support
app.use((req, res, next) => {
  // Allow credentials (cookies) to be sent cross-origin
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // In development, allow any origin
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  // Allow all needed headers and methods
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

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
  // Initialize Firebase data if needed
  if (process.env.USE_FIRESTORE === 'true') {
    try {
      const { storage } = await import('./storage');
      
      // Initialize demo data for Firestore if it's empty
      if ('initializeData' in storage) {
        log('Initializing Firestore data if needed...', 'firebase');
        await storage.initializeData();
      }
    } catch (error) {
      console.error('Error initializing Firestore data:', error);
    }
  }

  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Express error handler:", err);
    console.error("Request details:", {
      method: req.method,
      url: req.url,
      sessionId: req.session?.id,
      hasUserId: !!req.session?.userId,
      cookies: req.headers.cookie
    });

    res.status(status).json({ message });
    
    // Don't throw the error again, as it would crash the server
    // This was a bug in the original code
    // throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
