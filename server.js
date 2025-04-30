require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;
const secretKey = process.env.SECRET_KEY;
const mongoURI = process.env.MONGODB_URI;

if (!secretKey) {
  console.error("SECRET_KEY environment variable is not set!");
  process.exit(1);
}

if (!mongoURI) {
  console.error("MONGODB_URI environment variable is not set!");
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
async function connectToMongo() {
  await mongoose.connect(mongoURI, { dbName: "unidata" });
  console.log("Connected to MongoDB.");
}

// User schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  availableDaysOff: { type: Number, default: 0 },
});
const User = mongoose.model('User', userSchema);

// Routes
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.post('/api/register', async (req, res) => {
  const { name, username, password, role, availableDaysOff } = req.body;

  const trimmedName = name?.trim();
  const trimmedUsername = username?.trim();
  const trimmedPassword = password?.trim();
  const trimmedRole = role?.trim();
  const trimmedAvailableDaysOff = availableDaysOff;

  try {
    if (!trimmedName || !trimmedUsername || !trimmedPassword || !trimmedRole) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ username: trimmedUsername });
    if (existingUser) {
      return res.status(400).json({ message: 'اسم المستخدم موجود بالفعل' });
    }

    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

    const newUser = new User({
      name: trimmedName,
      username: trimmedUsername,
      password: hashedPassword,
      role: trimmedRole,
      availableDaysOff: parseInt(trimmedAvailableDaysOff, 10) || 0,
    });

    await newUser.save();
    res.status(201).json({ message: 'تم تسجيل المستخدم بنجاح' });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'فشل التسجيل', error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const trimmedUsername = username?.trim();
  const trimmedPassword = password?.trim();

  try {
    const user = await User.findOne({ username: trimmedUsername });

    if (!user) {
      return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const passwordMatch = await bcrypt.compare(trimmedPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const { _id, name, role, availableDaysOff } = user;
    const token = jwt.sign({ userId: _id }, secretKey, { expiresIn: '1h' });

    res.json({
      token,
      user: {
        _id,
        name,
        username: trimmedUsername,
        role,
        availableDaysOff,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
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

app.get('/api/protected', authenticate, (req, res) => {
  res.json({ message: 'This is a protected resource!', userId: req.userId });
});

connectToMongo().then(() => {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}).catch((err) => {
  console.error("Failed to connect to MongoDB:", err);
  process.exit(1);
});
