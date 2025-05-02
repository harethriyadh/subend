const mongoose = require('mongoose');

const mongoURI = process.env.MONGODB_URI;

const userSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['employee', 'manager', 'admin', 'leader'] },
    availableDaysOff: { // Corrected default value definition
        type: Number,
        default: function() {
            const startDate = new Date('2024-12-01');
            const today = new Date();
            let months = (today.getFullYear() - startDate.getFullYear()) * 12;
            months -= startDate.getMonth();
            months += today.getMonth();
            let days = months * 2;
            return Math.max(days, 0); // Ensure non-negative value
        }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

const sessionSchema = new mongoose.Schema({
    session_id: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_at: {
      type: Date,
      default: () => new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000),
    },
    expires_at: { type: Date, required: true },
  });

const Session = mongoose.model('Session', sessionSchema);

async function connectToMongo() {
    if (!mongoURI) {
        console.error("MONGODB_URI environment variable is not set!");
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoURI, {
            dbName: process.env.DB_NAME || 'unidata' // Using 'unidata' as fallback based on your server.js
        });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

connectToMongo();

module.exports = { User, Session, connectToMongo };

async function checkMongoConnection(uri) {
    try {
        console.log("Connecting to MongoDB with URI:", uri);

        await mongoose.connect(uri, {
            dbName: process.env.DB_NAME || 'unidata', // Using 'unidata' as fallback
        });
        console.log("MongoDB connection test successful!");
        return true;
    } catch (error) {
        console.error("MongoDB connection test failed:", error);

        if (error.name === 'MongoServerError' && error.code === 8000) {
            console.error("Authentication error. Check username and password in MONGODB_URI.");
        } else if (error.name === 'MongooseError' && error.message.includes('timed out')) {
            console.error("Connection timed out. Check network connectivity and MongoDB server status.");
        } else if (error.name === 'MongooseError' && error.message.includes('Server selection timed out')) {
            console.error("Server selection timed out. Check if MongoDB Atlas is running and accessible.");
        } else if (error.name === 'MongoNetworkError') {
            console.error("A network error occurred. Check your internet connection and firewall.");
        } else if (error.message.includes('queryTxt ETIMEOUT')) {
            console.error("DNS resolution error. Check your DNS settings and network connectivity.");
        } else {
            console.error("Other connection error:", error);
        }
        return false;
    } finally {
        // Disconnect after the test to avoid keeping the connection open unnecessarily
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log("Disconnected MongoDB after test.");
        }
    }
}

// You might want to call this function separately to test your connection
// checkMongoConnection(mongoURI);