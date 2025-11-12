import { Router } from 'express';
import listsRoutes from './listsRoutes.js';
import masterRoutes from './masterRoutes.js';
import authRoutes from './authRoutes.js';
import { requireSession } from '../middleware/requireSession.js';

const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

apiRouter.use('/auth', authRoutes);
apiRouter.use(requireSession);
apiRouter.use('/', listsRoutes);
apiRouter.use('/master', masterRoutes);

export { apiRouter };
export default apiRouter;
