import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from './auth.types';

export interface UserDocument extends Document {
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, maxlength: 254 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
);

export const UserModel = mongoose.model<UserDocument>('User', userSchema);
