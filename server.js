require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Retrieve environment variables
const secretKey = process.env.SECRET_KEY;
const mongoURI = process.env.MONGODB_URI;
const port = process.env.PORT || 3000; // Use PORT from environment or default to 3000

// Check if required environment variables are set
if (!secretKey) {
  console.error("SECRET_KEY environment variable is not set!");
  process.exit(1);
}

if (!mongoURI) {
  console.error("MONGODB_URI environment variable is not set!");
  process.exit(1);
}

app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

// MongoDB Connection
async function checkMongoConnection(uri) {
  try {
    console.log("Connecting to MongoDB with URI:", uri);
    await mongoose.connect(uri, { dbName: "unidata" });
    console.log("MongoDB connection test successful!");
    return true;
  } catch (error) {
    console.error("MongoDB connection test failed:", error);

    if (error.name === 'MongoServerError' && error.code === 8000) {
      console.error("Authentication error. Check username and password in MONGODB_URI.");
    } else if (error.name === 'MongooseError' && error.message.includes('timed out')) {
      console.error("Connection timed out. Check network connectivity and MongoDB server status.");
    } else if (error.name === 'MongooseError' && error.message.includes('Server selection timed out')) {
      console.error("Server selection timed out.  Check if MongoDB Atlas is running and accessible.");
    } else if (error.name === 'MongoNetworkError') {
      console.error("A network error occurred. Check your internet connection and firewall.");
    } else if (error.message.includes('queryTxt ETIMEOUT')) {
      console.error("DNS resolution error.  Check your DNS settings and network connectivity.");
    } else {
      console.error("Other connection error:", error);
    }
    return false;
  }
}

// Start the server after successful MongoDB connection
checkMongoConnection(mongoURI).then(isConnected => {
  if (!isConnected) {
    console.error("MongoDB connection failed.  Exiting.");
    process.exit(1);
  } else {
    // Define User Schema and Model
    const userSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      password: { type: String, required: true },
    });
    const User = mongoose.model('User', userSchema);

    // Routes
    app.get('/', (req, res) => {
      res.send('Hello, World!');
    });

    app.post('/api/register', async (req, res) => {
      // ... (registration logic as before)
    });

    app.post('/api/login', async (req, res) => {
      // ... (login logic as before)
    });

    app.get('/api/protected', authenticate, (req, res) => {
      res.json({ message: 'This is a protected resource!', userId: req.userId });
    });

    function authenticate(req, res, next) {
      const token = req.header('Authorization')?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
      }
      try {
        const decoded = jwt.verify(token, secretKey);
        req.userId = decoded.userId;
        next();
      } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
      }
    }

    // Start the Express server
    app.listen(port, () => {
      console.log(`Server listening at http://localhost:${port}`);
    });
  }
});