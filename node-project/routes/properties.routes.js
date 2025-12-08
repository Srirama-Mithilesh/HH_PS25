// routes/properties.routes.js
import { Router } from 'express';
import multer from "multer";
import {
  getAllProperties,
  searchProperties,
  getPropertyDetails,
  getSearchPropertyDetailsPOST,
  getSearchPropertyDetailsGET,
  updateProfile,
  searchHotels,
  booking,
  confirmBooking,
  userBooking,
  addProperty,
  editProperty,
  removeProp
} from '../controllers/properties.controller.js';

import { authenticateToken } from '../middleware/auth.middleware.js'; // optional middleware you may have
import { supabase } from '../config/supabase.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api -> all destinations
router.get('/', getAllProperties);

// GET /api/search?destination=Goa&guests=2
router.get('/search', searchProperties);

// POST /api/search/details  (body: {destination, checkIn, checkOut})  -- Code 1 style
router.post('/search/details', getSearchPropertyDetailsPOST);

// GET /api/search/details/:destination  (legacy Code 2 style) — added per request (A1)
router.get('/search/details/:destination', getSearchPropertyDetailsGET);

// GET /api/details/:destination  -> destination page with hotels + rooms (is_available only)
router.get('/details/:destination', getPropertyDetails);

// PATCH /api/profile  (update profile) - you may secure with authenticateToken in middleware
router.patch('/profile', updateProfile);

// GET /api/hotels/search-availability
router.get('/hotels/search-availability', searchHotels);

// GET /api/hotels/:hotelID/booking  -> load hotel + available rooms
router.get('/hotels/:hotelID/booking', booking);

// POST /api/confirmBooking  -> create booking (authenticated via supabase token)
router.post('/confirmBooking', authenticateToken, confirmBooking);

// GET /api/user/bookings  -> bookings for authenticated user
router.get('/user/bookings', authenticateToken, userBooking);

/* Legacy/insecure route from Code 2 is intentionally left out of active routes.
   If you need it for admin/testing, uncomment and secure it properly.
   Example (NOT RECOMMENDED):
   // router.get('/confirmBooking/:roomId/:checkin/:checkout/:price/:guests/:email', legacyConfirmBooking);
*/

// Export router
router.post(
  "/addProperty",
  authenticateToken,
  upload.array("photos", 10),
  addProperty
);

router.get(
  "/editProperty/:propertyId",
  authenticateToken,
  async (req, res) => {
    const propId = req.params.propertyId;

    const { data, error } = await supabase
      .from("hotels")
      .select("*")
      .eq("id", propId)
      .single();

    if (error) {
      return res.json({ success: false });
    }

    const { data: roomData } = await supabase
      .from("rooms")
      .select("*")
      .eq("hotel_id", propId)
      .single();

    return res.json({
      success: true,
      property: {
        ...data,
        ...roomData
      }
    });
  }
);


router.post(
  "/editProperty/:propertyId",
  authenticateToken,
  upload.array("photos", 10),
  editProperty
);

router.get(`/removeProperty/:userId/:propertyId`, removeProp);



export default router;
