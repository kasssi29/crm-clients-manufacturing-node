import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*', // Adjust for production!
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

export default function securityMiddleware(app) {
  app.use(cors(corsOptions));
  app.use(helmet());
  app.use(limiter);
}