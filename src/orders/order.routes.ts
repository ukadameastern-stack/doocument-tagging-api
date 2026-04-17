import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validate';
import { orderCreateSchema, orderUpdateSchema, listOrdersQuerySchema } from './order.schemas';
import * as controller from './order.controller';

const router = Router();

router.use(authenticate);

router.post('/', validateBody(orderCreateSchema), controller.createOrder);
router.get('/', validateQuery(listOrdersQuerySchema), controller.listOrders);
router.get('/:id', controller.getOrder);
router.put('/:id', validateBody(orderUpdateSchema), controller.updateOrder);
router.patch('/:id/cancel', controller.cancelOrder);
router.delete('/:id', controller.deleteOrder);

export default router;
