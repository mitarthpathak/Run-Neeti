import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

console.log('Testing connection to:', process.env.MONGO_URI);

try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('SUCCESS: Connected to MongoDB');
    process.exit(0);
} catch (err) {
    console.error('FAILURE: Could not connect');
    console.error(err);
    process.exit(1);
}
