import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
import Location from './models/Location.js';

dotenv.config();

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy_db'); // Fallback URI
        console.log("Connected to DB");

        const admin = await User.findOne({ email: 'admin@example.com' });
        if (!admin) {
            await User.create({
                name: 'Admin',
                email: 'admin@example.com',
                password: 'password123',
                role: 'admin'
            });
            console.log("Admin created");
        } else {
             console.log("Admin already exists");
        }

        const locs = await Location.countDocuments();
        if (locs === 0) {
            await Location.create([
                { name: 'Main Warehouse', type: 'Warehouse' },
                { name: 'Pharmacy Store', type: 'Store' }
            ]);
            console.log("Locations created");
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

seed();
