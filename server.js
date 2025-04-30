require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');
const { User, connectToMongo } = require('./mongo'); // Import User model and connectToMongo

const app = express();
const port = process.env.PORT || 8080;
const secretKey = process.env.SECRET_KEY;

// Retrieve environment variables
const SECRET_KEY = process.env.SECRET_KEY;
const mongoURI = process.env.MONGODB_URI;
const port = process.env.PORT || 3000;

if (!secretKey) {
  console.error("SECRET_KEY environment variable is not set!");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// MongoDB Connection and Test
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
    console.error("MONGODB_URI environment variable is not set!");
    process.exit(1);
}

async function checkMongoConnection(uri) {
  try {
    console.log("Connecting to MongoDB with URI:", uri); // <--- URI logging

    await mongoose.connect(uri, {
      dbName: "unidata"
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

checkMongoConnection(mongoURI).then(isConnected => {
  if (!isConnected) {
    console.error("MongoDB connection failed.  Exiting.");
    process.exit(1);
  } else {
    const userSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      password: { type: String, required: true },
    });

    const User = mongoose.model('User', userSchema);

    app.get('/', (req, res) => {
      res.send('Hello, World!');
    });

    app.post('/api/register', async (req, res) => {
      const { username, password } = req.body;

            try {
                // Trim whitespace from all input fields
                const trimmedName = name ? name.trim() : '';
                const trimmedUsername = username ? username.trim() : '';
                const trimmedPassword = password ? password.trim() : '';
                const trimmedRole = role ? role.trim() : '';
                const trimmedAvailableDaysOff = availableDaysOff ? String(availableDaysOff).trim() : ''; // Trim availableDaysOff

                const errors = {};

                // Check for missing required fields with specific error messages
                if (!trimmedName) {
                    errors.name = 'الاسم مطلوب'; // Name is required
                }
                if (!trimmedUsername) {
                    errors.username = 'اسم المستخدم مطلوب'; // Username is required
                }
                if (!trimmedPassword) {
                    errors.password = 'كلمة المرور مطلوبة'; // Password is required
                }
                if (!trimmedRole) {
                    errors.role = 'الدور مطلوب'; // Role is required
                }
                // You might want to make availableDaysOff mandatory as well, depending on your requirements
                if (availableDaysOff === undefined || trimmedAvailableDaysOff === '') {
                    errors.availableDaysOff = 'عدد أيام الإجازة المتاحة مطلوب'; // Available days off is required
                } else if (isNaN(parseInt(trimmedAvailableDaysOff, 10))) {
                    errors.availableDaysOff = 'عدد أيام الإجازة المتاحة يجب أن يكون رقمًا'; // Available days off must be a number
                }

                // If there are any errors, return a 400 status with the error object
                if (Object.keys(errors).length > 0) {
                    return res.status(400).json({ errors: errors, message: 'الرجاء إدخال جميع الحقول المطلوبة بشكل صحيح' }); // Please enter all required fields correctly
                }

                const existingUser = await User.findOne({ username: trimmedUsername });
                if (existingUser) {
                    return res.status(400).json({ message: 'اسم المستخدم موجود بالفعل' }); // Username already exists
                }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully' });
      } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 11000 && error.keyPattern && error.keyPattern.username === 1) { // MongoDB duplicate key error (username)
          return res.status(400).json({ message: 'Username already exists' });
        } else if (error.name === 'ValidationError') {
          return res.status(400).json({ message: error.message }); // Mongoose validation error
        }
        res.status(500).json({ message: 'Registration failed', error: error.message });
      }
    });

        app.post('/api/login', async (req, res) => {
            const { username, password } = req.body;

            try {
                // Trim whitespace from username and password
                const trimmedUsername = username ? username.trim() : '';
                const trimmedPassword = password ? password.trim() : '';

                const user = await User.findOne({ username: trimmedUsername });

                if (!user) {
                    return res.status(401).json({ message: 'Invalid username or password' });
                }

                const passwordMatch = await bcrypt.compare(trimmedPassword, user.password);

        if (passwordMatch) {
          const token = jwt.sign({ userId: user._id }, secretKey, { expiresIn: '1h' });
          res.json({ token });
        } else {
          res.status(401).json({ message: 'Invalid username or password' });
        }
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed', error: error.message });
      }
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

    app.listen(port, () => {
      console.log(`Server listening at http://localhost:${port}`);
    });
  }
});