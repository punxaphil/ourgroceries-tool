import { Router } from 'express';
import listsRoutes from './listsRoutes.js';
import masterRoutes from './masterRoutes.js';

const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

apiRouter.use('/', listsRoutes);
apiRouter.use('/master', masterRoutes);

export { apiRouter };
export default apiRouter;
