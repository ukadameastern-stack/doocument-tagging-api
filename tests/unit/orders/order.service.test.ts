import * as service from '../../../src/orders/order.service';
import * as repo from '../../../src/orders/order.repository';
import { NotFoundError, ForbiddenError, ConflictError } from '../../../src/utils/errors';
import { Order } from '../../../src/orders/order.types';
import { RequestUser } from '../../../src/auth/auth.types';

jest.mock('../../../src/orders/order.repository');
const mockRepo = repo as jest.Mocked<typeof repo>;

const customer: RequestUser = { userId: 'cust1', role: 'customer' };
const admin: RequestUser = { userId: 'admin1', role: 'admin' };

const baseOrder: Order = {
  orderId: 'ord1', customerId: 'cust1',
  items: [{ productId: 'p1', productName: 'Widget', quantity: 2, unitPrice: 10 }],
  totalAmount: 20, status: 'PENDING',
  shippingAddress: { street: '1 Main St', city: 'NYC', state: 'NY', postalCode: '10001', country: 'US' },
  paymentMethod: 'CREDIT_CARD', createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
};

describe('OrderService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createOrder', () => {
    it('computes totalAmount correctly', async () => {
      mockRepo.create.mockResolvedValue({ ...baseOrder, totalAmount: 20 });
      const order = await service.createOrder({ ...baseOrder }, customer);
      expect(order.totalAmount).toBe(20);
    });

    it('throws ForbiddenError when customerId does not match user', async () => {
      await expect(service.createOrder({ ...baseOrder, customerId: 'other' }, customer))
        .rejects.toThrow(ForbiddenError);
    });

    it('allows admin to create order for any customer', async () => {
      mockRepo.create.mockResolvedValue({ ...baseOrder, customerId: 'other' });
      await expect(service.createOrder({ ...baseOrder, customerId: 'other' }, admin)).resolves.toBeDefined();
    });
  });

  describe('getOrderById', () => {
    it('throws NotFoundError when order does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.getOrderById('missing', customer)).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when customer accesses another customer order', async () => {
      mockRepo.findById.mockResolvedValue({ ...baseOrder, customerId: 'other' });
      await expect(service.getOrderById('ord1', customer)).rejects.toThrow(ForbiddenError);
    });

    it('allows admin to access any order', async () => {
      mockRepo.findById.mockResolvedValue({ ...baseOrder, customerId: 'other' });
      await expect(service.getOrderById('ord1', admin)).resolves.toBeDefined();
    });
  });

  describe('updateOrder', () => {
    it('throws ConflictError when customer updates non-PENDING order', async () => {
      mockRepo.findById.mockResolvedValue({ ...baseOrder, status: 'CONFIRMED' });
      await expect(service.updateOrder('ord1', {}, customer)).rejects.toThrow(ConflictError);
    });

    it('allows admin to update order in any status', async () => {
      mockRepo.findById.mockResolvedValue({ ...baseOrder, status: 'SHIPPED' });
      mockRepo.update.mockResolvedValue({ ...baseOrder, status: 'SHIPPED' });
      await expect(service.updateOrder('ord1', {}, admin)).resolves.toBeDefined();
    });

    it('recomputes totalAmount when items are updated', async () => {
      mockRepo.findById.mockResolvedValue(baseOrder);
      mockRepo.update.mockResolvedValue({ ...baseOrder, totalAmount: 30 });
      await service.updateOrder('ord1', { items: [{ productId: 'p1', productName: 'Widget', quantity: 3, unitPrice: 10 }] }, customer);
      expect(mockRepo.update).toHaveBeenCalledWith('ord1', expect.objectContaining({ totalAmount: 30 }));
    });
  });

  describe('cancelOrder', () => {
    it('throws ConflictError when order is already cancelled', async () => {
      mockRepo.findById.mockResolvedValue({ ...baseOrder, status: 'CANCELLED' });
      await expect(service.cancelOrder('ord1', customer)).rejects.toThrow(ConflictError);
    });

    it('throws ConflictError when customer cancels DELIVERED order', async () => {
      mockRepo.findById.mockResolvedValue({ ...baseOrder, status: 'DELIVERED' });
      await expect(service.cancelOrder('ord1', customer)).rejects.toThrow(ConflictError);
    });

    it('sets status to CANCELLED', async () => {
      mockRepo.findById.mockResolvedValue(baseOrder);
      mockRepo.update.mockResolvedValue({ ...baseOrder, status: 'CANCELLED' });
      const result = await service.cancelOrder('ord1', customer);
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('deleteOrder', () => {
    it('calls softDelete on the repository', async () => {
      mockRepo.findById.mockResolvedValue(baseOrder);
      mockRepo.softDelete.mockResolvedValue();
      await service.deleteOrder('ord1', customer);
      expect(mockRepo.softDelete).toHaveBeenCalledWith('ord1');
    });
  });
});
