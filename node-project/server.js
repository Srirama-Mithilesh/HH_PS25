// server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import { supabase } from "./config/supabase.js";
import { startScheduledTasks } from './utils/scheduledTasks.js';

import propertiesRoutes from './routes/properties.routes.js';
import authRoutes from "./routes/auth.routes.js";
import reviewRoutes from "./routes/reviews.routes.js";
import listingRoutes from "./routes/listing.routes.js";
import { searchHotels } from './controllers/properties.controller.js';
import adminRoutes from "./routes/admin.routes.js";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Paths / static files ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

startScheduledTasks();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from /public  
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---
// Properties/search routes
app.use('/api', authRoutes);
app.use('/api', propertiesRoutes);
app.use('/api/listings', listingRoutes);
app.use("/api", adminRoutes);

// --- GET reviews for a hotel ---
app.get("/api/reviews", async (req, res) => {
  const hotelId = req.query.hotel_id;
  
  try {
    const { data, error } = await supabase
    .from("reviews")
    .select(`
      id,
      rating,
      review_text,
      user_id,
      user_email,
      created_at
      `)
      .eq("hotel_id", hotelId)
      .order("created_at", { ascending: false });
      
      if (error) return res.status(400).json({ error: error.message });
      
      res.json(data);
    } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get('/api/search', (req,res) => {
  searchHotels(req,res);
});

app.get("/api/search/details/:id", async (req, res) => {
  const hotelId = req.params.id;

  try {
    const { data, error } = await supabase
      .from("hotels")
      .select("*")
      .eq("id", hotelId)
      .single(); // get a single hotel

      if (error) return res.status(400).json({ error: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/hotels/:hotelId/amenities", async (req, res) => {
  const hotelId = req.params.hotelId;

  try {
    // 1. Get all rooms in the hotel
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("id")
      .eq("hotel_id", hotelId);

    if (roomsError) return res.status(400).json({ error: roomsError.message });
    const roomIds = rooms.map(r => r.id);

    // 2. Get all amenities for those rooms
    const { data: roomAmenities, error: amenitiesError } = await supabase
      .from("room_amenities")
      .select("amenities(name)")
      .in("room_id", roomIds);

    if (amenitiesError) return res.status(400).json({ error: amenitiesError.message });

    // 3. Remove duplicates
    const uniqueAmenities = [...new Set(roomAmenities.map(item => item.amenities.name))];

    res.json(uniqueAmenities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.use("/api/hotels", reviewRoutes);

// --- Page routes (you can also just open the HTML files directly) ---
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Default route -> dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Optional: health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// app.get("/api/is-admin", async (req, res) => {
//   const userId = req.user.id; // assuming your authenticateToken adds `req.user`
  
//   // Fetch user from database
//   const user = await db.users.findUnique({ where: { id: userId } });

//   if (!user) return res.status(404).json({ error: "User not found" });

//   // Here is where isAdmin comes from your DB
//   res.json({ isAdmin: user.isAdmin }); // make sure the DB field is correct
// });

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

