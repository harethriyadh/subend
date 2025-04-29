const mongoose = require('mongoose');

const mongoURI = process.env.MONGODB_URI;

const userSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['employee', 'manager', 'admin', 'leader'] },
    availableDaysOff: {  // Corrected default value definition
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

const sessionSchema = new mongoose.Schema({
    session_id: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now },
    expires_at: { type: Date, required: true },
});

const User = mongoose.model('User', userSchema);

async function connectToMongo() {
    if (!mongoURI) {
        console.error("MONGODB_URI environment variable is not set!");
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoURI, {
            dbName: process.env.DB_NAME || 'your_database_name'
        });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

connectToMongo();

module.exports = { User, connectToMongo };

async function checkMongoConnection(uri) {
    try {
        console.log("Connecting to MongoDB with URI:", uri);

        await mongoose.connect(uri, {
            dbName: process.env.DB_NAME || 'your_database_name',
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
    }
}






// const mongoose = require('mongoose');

// const mongoURI = process.env.MONGODB_URI; // No default value here!

// const userSchema = new mongoose.Schema({
//   username: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
// });

// const User = mongoose.model('User', userSchema);

// async function connectToMongo() {
//   if (!mongoURI) {
//     console.error("MONGODB_URI environment variable is not set!");
//     process.exit(1); // Exit if URI is missing
//   }

//   try {
//     await mongoose.connect(mongoURI, {
//       dbName: process.env.DB_NAME || 'your_database_name' // Keep dbName with fallback
//     });
//     console.log('Connected to MongoDB');
//   } catch (error) {
//     console.error('Error connecting to MongoDB:', error);
//     process.exit(1); // Exit on connection error
//   }
// }

// connectToMongo();

// module.exports = { User, connectToMongo };