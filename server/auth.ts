import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, registerSchema, loginSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'dpo-fast-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: 'Credenciais inválidas' });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate input data
      const validatedData = registerSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ 
          message: "Username já está em uso",
          errors: { username: ["Username já está em uso"] }
        });
      }

      const existingEmailUser = await storage.getUserByEmail(validatedData.email);
      if (existingEmailUser) {
        return res.status(400).json({ 
          message: "Email já está em uso",
          errors: { email: ["Email já está em uso"] }
        });
      }

      // Create user with hashed password
      const user = await storage.createUser({
        ...validatedData,
        password: await hashPassword(validatedData.password),
      });

      // Remove password from response
      const { password: _, ...userResponse } = user;

      req.login(userResponse as SelectUser, (err) => {
        if (err) return next(err);
        res.status(201).json(userResponse);
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const validationError = fromZodError(error);
        return res.status(400).json({
          message: "Dados de registro inválidos",
          errors: validationError.message,
        });
      }
      console.error('Registration error:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    try {
      // Validate input data
      const validatedData = loginSchema.parse(req.body);
      
      passport.authenticate("local", (err: any, user: SelectUser | false, info: any) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ message: "Erro interno do servidor" });
        }
        
        if (!user) {
          return res.status(401).json({ 
            message: info?.message || "Credenciais inválidas" 
          });
        }

        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error('Session login error:', loginErr);
            return res.status(500).json({ message: "Erro ao criar sessão" });
          }
          
          // Remove password from response
          const { password: _, ...userResponse } = user;
          res.status(200).json(userResponse);
        });
      })(req, res, next);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const validationError = fromZodError(error);
        return res.status(400).json({
          message: "Dados de login inválidos",
          errors: validationError.message,
        });
      }
      console.error('Login validation error:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    // Remove password from response
    const { password: _, ...userResponse } = req.user;
    res.json(userResponse);
  });

  // Middleware to protect routes
  app.use("/api/*", (req, res, next) => {
    // Skip auth endpoints
    if (req.path.startsWith('/api/login') || 
        req.path.startsWith('/api/register') || 
        req.path.startsWith('/api/user')) {
      return next();
    }

    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    next();
  });
}