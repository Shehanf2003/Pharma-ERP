import Customer from '../models/Customer.js';
import { z } from 'zod';

export const createCustomer = async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      phoneNumber: z.string().min(1), // Basic check, expand regex if needed
      email: z.string().email().optional().or(z.literal('')),
      address: z.string().optional()
    });

    const validated = schema.parse(req.body);

    const existing = await Customer.findOne({ phoneNumber: validated.phoneNumber });
    if (existing) {
      return res.status(400).json({ message: 'Customer with this phone number already exists' });
    }

    const customer = new Customer(validated);
    await customer.save();

    res.status(201).json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    res.status(500).json({ message: error.message });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phoneNumber: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const customers = await Customer.find(query).sort({ updatedAt: -1 }).limit(50);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
