import mongoose, { Schema, Document } from 'mongoose';
import { Order, OrderStatus, PaymentMethod } from './order.types';

export type OrderDocument = Order & Document;

const orderItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true, maxlength: 200 },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0.01 },
  },
  { _id: false },
);

const shippingAddressSchema = new Schema(
  {
    street: { type: String, required: true, maxlength: 200 },
    city: { type: String, required: true, maxlength: 100 },
    state: { type: String, required: true, maxlength: 100 },
    postalCode: { type: String, required: true, maxlength: 20 },
    country: { type: String, required: true, maxlength: 100 },
  },
  { _id: false },
);

const statuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const paymentMethods: PaymentMethod[] = ['CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'BANK_TRANSFER'];

const orderSchema = new Schema<OrderDocument>(
  {
    orderId: { type: String, required: true, unique: true },
    customerId: { type: String, required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: statuses, required: true, default: 'PENDING', index: true },
    shippingAddress: { type: shippingAddressSchema, required: true },
    paymentMethod: { type: String, enum: paymentMethods, required: true },
    notes: { type: String, maxlength: 500 },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } },
);

orderSchema.index({ customerId: 1, status: 1 });
orderSchema.index({ createdAt: 1 });

export const OrderModel = mongoose.model<OrderDocument>('Order', orderSchema);
