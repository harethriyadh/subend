// mongo.js
const mongoose = require('mongoose');

const mongoURI = process.env.MONGODB_URI;

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['employee', 'manager',  'leader','admin'], default: 'employee' }, // Added role field
});

const User = mongoose.model('User', userSchema);

async function connectToMongo() {
  if (!mongoURI) {
    console.error("MONGODB_URI environment variable is not set!");
    process.exit(1); // Exit if URI is missing
  }

  try {
    await mongoose.connect(mongoURI, {
      dbName: process.env.DB_NAME || 'your_database_name' // Keep dbName with fallback
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit on connection error
  }
}

connectToMongo();

module.exports = { User, connectToMongo };