import express from 'express';
import helmet from 'helmet';
import { corsMiddleware } from './middlewares/cors.middleware.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';
import { noIndexApi, robotsTxt } from './middlewares/robots.middleware.js';
import routes from './routes/api-routes.js';

const app = express();
app.set('trust proxy', 1); // Render est derrière un proxy
app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: '100kb' }));
app.get('/robots.txt', robotsTxt);
app.use(noIndexApi);
app.use('/api/v1', routes);
app.use(notFound);
app.use(errorHandler);

export default app;
