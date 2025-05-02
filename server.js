require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');
const {v4: uuidv4} = require('uuid'); // For generating unique session IDs

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
app.use(express.urlencoded({extended: true}));

// MongoDB connection
async function connectToMongo() {
    await mongoose.connect(mongoURI, {dbName: "unidata"});
    console.log("Connected to MongoDB.");
}

// User schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    availableDaysOff: {
        type: Number,
        default: 0
    }
});
const User = mongoose.model('User', userSchema);

// Session schema (assuming you have this in your mong.js)
const sessionSchema = new mongoose.Schema({
    session_id: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    expires_at: {
        type: Date,
        required: true
    }
});
const Session = mongoose.model('Session', sessionSchema);

// Middleware to verify the token and check session (now also checks database
// session)
async function authenticate(req, res, next) {
    const token = req.header('Authorization') && req
        .header('Authorization')
        .split(' ')[1];

    if (!token) {
        return res
            .status(401)
            .json({message: 'No token, authorization denied'});
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        req.userId = decoded.userId;

        // Optional: You could also verify the session ID against the database here If
        // you are using session IDs stored in cookies.

        next();
    } catch (err) {
        return res
            .status(401)
            .json({message: 'Token is not valid'});
    }
}

app.get('/api/login', authenticate, async (req, res) => {
  try {
      const user = await User
          .findById(req.userId)
          .select('-password');
      if (!user) {
          return res
              .status(404)
              .json({ message: 'User not found for this token.' });
      }

      // Check for session expiry in the database
      const session = await Session.findOne({ user: req.userId });  // Use req.userId
      if (!session)
      {
           return res
              .status(401)
              .json({ message: 'Session expired. Please log in.' });
      }
      const now = new Date();
      if (session.expires_at < now) {
          // Optionally, delete the expired session
          await Session.deleteOne({ _id: session._id });
          return res
              .status(401)
              .json({ message: 'Session expired. Please log in.' });
      }

      res.json({ user });
  } catch (error) {
      console.error('Error fetching user data:', error);
      res
          .status(500)
          .json({ message: 'Error fetching user data.' });
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

    // Create a new session in the database
    const session_id = uuidv4();
    const expires_at = new Date(Date.now() + (2 * 60 * 1000));
    const newSession = new Session({
      session_id: session_id,
      user: _id,
      expires_at: expires_at
    });

    await newSession.save();

    res.json({
      token,
      user: { _id, name, username: trimmedUsername, role, availableDaysOff },
      sessionId: session_id // Optionally send the session ID back
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

app.post('/api/register', async (req, res) => {
    const {name, username, password, role, availableDaysOff} = req.body;

    const trimmedName = name
        ?.trim();
    const trimmedUsername = username
        ?.trim();
    const trimmedPassword = password
        ?.trim();
    const trimmedRole = role
        ?.trim();
    const trimmedAvailableDaysOff = availableDaysOff;

    try {
        if (!trimmedName || !trimmedUsername || !trimmedPassword || !trimmedRole) {
            return res
                .status(400)
                .json({message: 'All fields are required'});
        }

        const existingUser = await User.findOne({username: trimmedUsername});
        if (existingUser) {
            return res
                .status(400)
                .json({message: 'اسم المستخدم موجود بالفعل'});
        }

        const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

        const newUser = new User({
            name: trimmedName,
            username: trimmedUsername,
            password: hashedPassword,
            role: trimmedRole,
            availableDaysOff: parseInt(trimmedAvailableDaysOff, 10) || 0
        });

        await newUser.save();
        res
            .status(201)
            .json({message: 'تم تسجيل المستخدم بنجاح'});

    } catch (error) {
        console.error('Registration error:', error);
        res
            .status(500)
            .json({message: 'فشل التسجيل', error: error.message});
    }
});

app.get('/api/protected', authenticate, (req, res) => {
    res.json({message: 'This is a protected resource!', userId: req.userId});
});

async function authenticate(req, res, next) {
  console.log('Authenticate middleware called');
  const token = req.header('Authorization') && req.header('Authorization').split(' ')[1];
  console.log('Token received:', token);

  if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
      const decoded = jwt.verify(token, secretKey);
      req.userId = decoded.userId;
      next();
  } catch (err) {
      console.error('Token verification error:', err);
      return res.status(401).json({ message: 'Token is not valid' });
  }
}

connectToMongo()
    .then(() => {
        app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    })
    .catch((err) => {
        console.error("Failed to connect to MongoDB:", err);
        process.exit(1);
    });

module.exports = authenticate;