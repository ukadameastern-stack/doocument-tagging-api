import { Router } from 'express';
import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.schemas';
import * as controller from './auth.controller';

const router = Router();

router.post('/register', validateBody(registerSchema), controller.register);
router.post('/login', validateBody(loginSchema), controller.login);
router.post('/refresh', validateBody(refreshTokenSchema), controller.refresh);
router.post('/logout', validateBody(refreshTokenSchema), controller.logout);

export default router;
