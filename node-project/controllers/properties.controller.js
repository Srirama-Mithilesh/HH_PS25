// controllers/properties.controller.js
import { supabase } from '../config/supabase.js';
import redis from '../config/redis.js';

/**
 * Helper: verify access token with Supabase and return user object or null
 * Expects raw access token (not "Bearer ...")
 */
async function getUserFromToken(accessToken) {
  try {
    if (!accessToken) return null;
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data?.user) return null;
    return data.user;
  } catch (err) {
    console.error('getUserFromToken error:', err);
    return null;
  }
}

/* ----------------------
   GET /api/ -> destinations
   ---------------------- */
export async function getAllProperties(req, res) {
  try {
    const cacheKey = 'destinations:all';
    const cached = await redis.get(cacheKey);
    // console.log(cached);
    if (cached) return res.json(JSON.parse(cached));

    const { data, error } = await supabase.from('destinations').select('*');
    // console.log(data);
    if (error) throw error;

    await redis.set(cacheKey, JSON.stringify(data || []), 'EX', 60 * 2); // 30 min
    return res.json(data || []);
  } catch (err) {
    console.error('getAllProperties error:', err);
    return res.status(500).json({ message: 'Failed to load destinations' });
  }
}

/* ----------------------
   GET /api/search -> search by city (query params)
   example: /api/search?destination=Goa&guests=2
   ---------------------- */
export async function searchProperties(req, res) {
  try {
    const { destination = '', guests } = req.query;
    if (!destination) return res.status(400).json({ message: 'Destination is required' });

    const cacheKey = `search:${destination.toLowerCase()}:${guests || 'any'}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .ilike('city', `%${destination}%`);

    if (error) throw error;
    const result = data || [];

    await redis.set(cacheKey, JSON.stringify(result), 'EX', 60 * 10); // 10 min
    return res.json(result);
  } catch (err) {
    console.error('searchProperties error:', err);
    return res.status(500).json({ message: 'Failed to search hotels' });
  }
}

/* ----------------------
   GET /api/details/:destination
   — returns a destination object and hotels + rooms (rooms filtered by is_available=true)
   ---------------------- */
export async function getPropertyDetails(req, res) {
  try {
    const destination = (req.params.destination || '').trim();
    if (!destination) return res.status(400).json({ message: 'Destination is required' });

    const cacheKey = `propertyDetails:${destination.toLowerCase()}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const { data: destinations = [], error: destErr } = await supabase
      .from('destinations')
      .select('*')
      .ilike('city', `%${destination}%`);

    if (destErr) throw destErr;

    const { data: hotels = [], error: hotelErr } = await supabase
      .from('hotels')
      .select('*')
      .ilike('city', `%${destination}%`);

    if (hotelErr) throw hotelErr;

    if (!hotels || hotels.length === 0) {
      return res.status(404).json({ message: `No hotels found in ${destination}` });
    }

    const dest = destinations?.[0] || null;

    const hotelsWithRooms = await Promise.all(
      hotels.map(async (hotel) => {
        const { data: rooms = [], error: roomErr } = await supabase
          .from('rooms')
          .select(`
            id,
            room_number,
            room_type,
            price_per_night,
            max_guests,
            is_available,
            images,
            room_amenities ( amenities ( id, name ) )
          `)
          .eq('hotel_id', hotel.id)
          .eq('is_available', true);

        if (roomErr) throw roomErr;

        const formatted = rooms.map((r) => ({
          ...r,
          amenities: (r.room_amenities || []).map((ra) => ra.amenities),
        }));

        return { ...hotel, rooms: formatted };
      })
    );

    const response = { ...dest, hotels: hotelsWithRooms };

    await redis.set(cacheKey, JSON.stringify(response), 'EX', 60 * 10);
    return res.json(response);
  } catch (err) {
    console.error('getPropertyDetails error:', err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
}

/* ----------------------
   POST /api/search/details  (Code 1 style)
   body: { destination, checkIn, checkOut }
   ---------------------- */
export async function getSearchPropertyDetailsPOST(req, res) {
  try {
    const { destination = '', checkIn, checkOut } = req.body;
    if (!destination) return res.status(400).json({ message: 'Destination is required' });

    const cleanIn = checkIn ? checkIn.split('T')[0] : null;
    const cleanOut = checkOut ? checkOut.split('T')[0] : null;

    const cacheKey = `searchPropertyDetails:${destination.toLowerCase()}:${cleanIn || ''}:${cleanOut || ''}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    // Find hotel by name (partial match)
    const { data: hotels = [], error: hotelError } = await supabase
      .from('hotels')
      .select('*')
      .ilike('name', `%${destination}%`);

    if (hotelError) throw hotelError;
    if (!hotels || hotels.length === 0) return res.status(404).json({ message: 'Hotel not found' });

    const hotel = hotels[0];

    // Fetch rooms (only available rooms)
    const { data: rooms = [], error: roomError } = await supabase
      .from('rooms')
      .select(`
        id,
        room_number,
        room_type,
        price_per_night,
        max_guests,
        is_available,
        room_amenities ( amenities ( id, name ) ),
        images
      `)
      .eq('hotel_id', hotel.id)
      .eq('is_available', true);

    if (roomError) throw roomError;

    let filteredRooms = rooms;

    if (cleanIn && cleanOut) {
      const { data: booked = [], error: bookedError } = await supabase
        .from('bookings')
        .select('room_id')
        .eq('hotel_id', hotel.id)
        .lt('check_in', cleanOut)   // booking.start < user.end
        .gt('check_out', cleanIn);  // booking.end > user.start

      if (bookedError) throw bookedError;
      const bookedIds = booked.map((b) => b.room_id);
      filteredRooms = rooms.filter((r) => !bookedIds.includes(r.id));
    }

    const formatted = filteredRooms.map((r) => ({
      ...r,
      amenities: (r.room_amenities || []).map((ra) => ra.amenities),
    }));

    const response = { ...hotel, rooms: formatted };
    await redis.set(cacheKey, JSON.stringify(response), 'EX', 60 * 5); // 5 min
    return res.json(response);
  } catch (err) {
    console.error('getSearchPropertyDetailsPOST error:', err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
}

/* ----------------------
   GET /api/search/details/:destination  (Code 2 style)
   — This supports existing frontend URLs like /api/search/details/Goa
   — No dates in URL (dates can be added as query params if desired)
   ---------------------- */
export async function getSearchPropertyDetailsGET(req, res) {
  try {
    const destination = (req.params.destination || '').trim();
    if (!destination) return res.status(400).json({ message: 'Destination is required' });

    // Optional dates via query params (e.g. ?checkIn=2025-12-10&checkOut=2025-12-12)
    const checkIn = req.query.checkIn || null;
    const checkOut = req.query.checkOut || null;
    const cleanIn = checkIn ? checkIn.split('T')[0] : null;
    const cleanOut = checkOut ? checkOut.split('T')[0] : null;

    const cacheKey = `searchPropertyDetails:get:${destination.toLowerCase()}:${cleanIn || ''}:${cleanOut || ''}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const { data: hotels = [], error: hotelError } = await supabase
      .from('hotels')
      .select('*')
      .ilike('name', `%${destination}%`);

    if (hotelError) throw hotelError;
    if (!hotels || hotels.length === 0) return res.status(404).json({ message: 'Hotel not found' });

    const hotel = hotels[0];

    const { data: rooms = [], error: roomError } = await supabase
      .from('rooms')
      .select(`
        id,
        room_number,
        room_type,
        price_per_night,
        max_guests,
        is_available,
        room_amenities ( amenities ( id, name ) ),
        images
      `)
      .eq('hotel_id', hotel.id)
      .eq('is_available', true);

    if (roomError) throw roomError;

    let filteredRooms = rooms;
    if (cleanIn && cleanOut) {
      const { data: booked = [], error: bookedError } = await supabase
        .from('bookings')
        .select('room_id')
        .eq('hotel_id', hotel.id)
        .lt('check_in', cleanOut)
        .gt('check_out', cleanIn);

      if (bookedError) throw bookedError;
      const bookedIds = booked.map((b) => b.room_id);
      filteredRooms = rooms.filter((r) => !bookedIds.includes(r.id));
    }

    const formattedRooms = filteredRooms.map((r) => ({
      ...r,
      amenities: (r.room_amenities || []).map((ra) => ra.amenities),
    }));

    const response = { ...hotel, rooms: formattedRooms };
    await redis.set(cacheKey, JSON.stringify(response), 'EX', 60 * 5);
    return res.json(response);
  } catch (err) {
    console.error('getSearchPropertyDetailsGET error:', err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
}

/* ----------------------
   PATCH /api/profile  -> update user email/name (uses supabase.admin)
   ---------------------- */
export async function updateProfile(req, res) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.split(' ')[1];
    const user = await getUserFromToken(token);
    if (!user) return res.status(401).json({ message: 'Missing or invalid token' });

    const { name, email } = req.body;
    const userId = user.id;

    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      email,
      user_metadata: { name },
    });

    if (error) {
      console.error('updateProfile supabase error:', error);
      return res.status(400).json({ message: error.message || 'Failed to update profile' });
    }

    return res.json({ message: 'Profile updated successfully', user: data });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/* ----------------------
   GET /api/hotels/search-availability (query params)
   Example: /api/hotels/search-availability?destination=Goa&checkIn=2025-12-10&checkOut=2025-12-12
   ---------------------- */
export async function searchHotels(req, res) {
  try {
    const { destination = '', checkIn, checkOut } = req.query;
    const cleanIn = checkIn ? checkIn.split('T')[0] : null;
    const cleanOut = checkOut ? checkOut.split('T')[0] : null;

    const { data: hotels = [], error: hotelError } = await supabase
      .from('hotels')
      .select('*')
      .ilike('city', `%${destination}%`);

    if (hotelError) throw hotelError;

    const availableHotels = [];
    for (const hotel of hotels) {
      const { data: rooms = [], error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('hotel_id', hotel.id)
        .eq('is_available', true);

      if (roomError) continue;

      let freeRooms = rooms;
      if (cleanIn && cleanOut) {
        const { data: booked = [] } = await supabase
          .from('bookings')
          .select('room_id')
          .eq('hotel_id', hotel.id)
          .lt('check_in', cleanOut)
          .gt('check_out', cleanIn);

        const bookedRoomIds = booked.map((b) => b.room_id);
        freeRooms = rooms.filter((r) => !bookedRoomIds.includes(r.id));
      }

      if ((freeRooms || []).length > 0) availableHotels.push({ ...hotel, rooms: freeRooms });
    }

    return res.json(availableHotels);
  } catch (err) {
    console.error('searchHotels error:', err);
    return res.status(500).json({ message: 'Internal error' });
  }
}

/* ----------------------
   GET /api/hotels/:hotelID/booking
   returns hotel name + available rooms
   ---------------------- */
export async function booking(req, res) {
  try {
    const hotelId = req.params.hotelID;
    if (!hotelId) return res.status(400).json({ message: 'Missing hotel_id in URL' });

    const { data: hotel, error: hotelErr } = await supabase
      .from('hotels')
      .select('name')
      .eq('id', hotelId)
      .single();

    if (hotelErr) {
      console.error(hotelErr);
      return res.status(500).json({ message: 'Failed to load hotel' });
    }

    const { data: rooms, error: roomsErr } = await supabase
      .from('rooms')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('is_available', true);

    if (roomsErr) {
      console.error(roomsErr);
      return res.status(500).json({ message: 'Failed to load rooms' });
    }

    return res.status(200).json({ hotelName: hotel.name, rooms });
  } catch (err) {
    console.error('booking error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/* ----------------------
   POST /api/confirmBooking
   Body: { roomId, checkin, checkout, price, guests }
   Auth: Supabase access token in Authorization header (Bearer ...)
   ---------------------- */
export async function confirmBooking(req, res) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.split(' ')[1];
    const user = await getUserFromToken(token);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    const { roomId, checkin, checkout, price, guests, payment } = req.body;
    if (!roomId || !checkin || !checkout) return res.status(400).json({ message: 'Missing required fields' });

    // Check if overlapping booking exists
    const { data: existing = [] } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', roomId)
      .lt('check_in', checkout)
      .gt('check_out', checkin);

    if (existing.length > 0) return res.status(400).json({ message: 'Room not available for selected dates' });

    const { error: bookingError } = await supabase.from('bookings').insert({
      user_id: user.id,
      room_id: roomId,
      check_in: checkin,
      check_out: checkout,
      total_price: price,
      max_guests: guests,
      status: 'confirmed',
    });

    if (bookingError) {
      console.error('confirmBooking insert error:', bookingError);
      return res.status(500).json({ message: 'Booking failed' });
    }

    // Mark room unavailable (best-effort)
    const { error: updateError } = await supabase.from('rooms').update({ is_available: false }).eq('id', roomId);
    if (updateError) console.error('confirmBooking mark room error:', updateError);

    return res.status(200).json({ message: 'Booking Successful' });
  } catch (err) {
    console.error('confirmBooking error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/* ----------------------
   GET /api/user/bookings  (authenticated)
   returns bookings for current authenticated user
   ---------------------- */
export async function userBooking(req, res) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.split(' ')[1];
    const user = await getUserFromToken(token);
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }


    const uid = user.id;
    const { data: bookings = [], error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('userBooking fetch error:', bookingsError);
      return res.status(500).json({ message: 'Error fetching bookings' });
    }

    // Attach hotel name for each booking
    const bookingdetails = await Promise.all(
      bookings.map(async (booking) => {
        const { data: room, error: roomError } = await supabase.from('rooms').select('hotel_id').eq('id', booking.room_id).single();
        if (roomError) throw roomError;
        const { data: hotel, error: hotelError } = await supabase.from('hotels').select('name').eq('id', room.hotel_id).single();
        if (hotelError) throw hotelError;
        return { hotel: hotel.name, ...booking };
      })
    );

    return res.json({ bookings: bookingdetails });
  } catch (err) {
    console.error('userBooking error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/* ----------------------
   OPTIONAL LEGACY FUNCTIONS FROM CODE 2 (kept for reference)
   — The insecure GET-based confirmBooking and email-based userBookings
   — These are intentionally NOT exported below to avoid routing activation.
   — If you want them enabled, I left commented code below for admin / maint use.
   ---------------------- */

/*

// LEGACY: GET /confirmBooking/:roomId/:checkin/:checkout/:price/:guests/:email
export async function legacyConfirmBooking(req, res) {
  // insecure: uses email param to find user; not recommended for production
  // Implementation originally from Code 2 (omitted here). Keep commented.
}

// LEGACY: GET /userBooking/:email
export async function legacyUserBookings(req, res) {
  // insecure: admin-only listing by email (omitted). Keep commented.
}

*/

async function uploadToSupabase(file, bucket) {
    const fileName = `${Date.now()}-${file.originalname}`;

    const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
        });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

    return publicUrl;
}

// Trigger city image and description generation
function triggerCityGeneration(city) {
    try {
      console.log("Triggering city generation for:", city);
        const url = `http://fastapi:8000/generate?city=${encodeURIComponent(city)}`;
        // Fire-and-forget; still attach catch to avoid unhandled rejection
        fetch(url, { method: "POST" })
            .then(res => {
                if (!res.ok) {
                    console.warn(`City generation request returned status ${res.status}`);
                }
            })
            .catch(err => {
                console.warn("Failed to call city generation service:", err.message || err);
            });
    } catch (err) {
        console.warn("Error while triggering city generation:", err.message || err);
    }
}


export async function addProperty(req, res) {
  try {
    const { name, location, priceRange, address, description, type } = req.body;

    // Background city-generation block
    try {
      const normalizedCity = location.trim();

      const { data: existingDest, error: destErr } = await supabase
        .from("destinations")
        .select("id")
        .ilike("city", `%${normalizedCity}%`)   // wildcard match
        .limit(1);

      if (destErr) {
        console.warn("Destination table check failed:", destErr.message);
      } else if (!existingDest || existingDest.length === 0) {
        console.log("City not found — triggering AI generation…");

        // Run non-blocking
        triggerCityGeneration(normalizedCity);
      } else {
        console.log("City already exists — skipping AI generation.");
      }

    } catch (innerErr) {
      console.warn("Destination lookup error:", innerErr.message);
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one image is required"
      });
    }

    const photoUrls = [];

    // Upload images
    for (const file of req.files) {
      const url = await uploadToSupabase(file, "hotel-image");
      photoUrls.push(url);
    }

    const hotelImageUrl = photoUrls[0];

    // Insert hotel
    const { data: hotelData, error: hotelErr } = await supabase
      .from("hotels")
      .insert([
        {
          name,
          city: location.trim(),
          address,
          description,
          image: hotelImageUrl,
          owner_id: req.userId,
        }
      ])
      .select();

    if (hotelErr) throw hotelErr;

    const hotelId = hotelData[0].id;

    // Insert room
    const { error: roomErr } = await supabase
      .from("rooms")
      .insert([
        {
          hotel_id: hotelId,
          room_number: "1",
          room_type: type,
          price_per_night: priceRange,
          max_guests: 2,
          images: photoUrls
        }
      ]);

    if (roomErr) throw roomErr;

    //used to have try block

    return res.json({
      success: true,
      message: "Property created successfully",
      hotelId
    });

  } catch (err) {
    console.error("ADD PROPERTY ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}


export async function removeProp(req, res) {
  try
  {
    const userId = req.params.userId;
    const propId = req.params.propertyId;

    console.log(userId);
    console.log(propId);

    const { error: deleteErr } = await supabase
      .from("hotels")
      .delete()
      .eq("id", propId)
      
    if (deleteErr) throw deleteErr;

    return res.json({
      success: true,
      message: "Property deleted successfully"
    });
  }
  catch (err) {
    console.error("REMOVE PROPERTY ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}


export async function editProperty(req, res) {
  try {
    const { name, location, priceRange, address, description, type } = req.body;

    // ✅ UUID must stay STRING
    const propId = req.params.propertyId;

    let imageUrl = null;

    // ✅ Upload image ONLY if provided
    if (req.files && req.files.length > 0) {
      const photoUrls = [];

      for (const file of req.files) {
        const url = await uploadToSupabase(file, "hotel-image");
        photoUrls.push(url);
      }

      imageUrl = photoUrls[0];
    }

    // ✅ UPDATE HOTEL (UUID SAFE)
    const { data: hotelData, error: hotelErr } = await supabase
      .from("hotels")
      .update({
        name,
        city: location,
        address,
        description,
        ...(imageUrl && { image: imageUrl })
      })
      .eq("id", propId)
      .select();

    if (hotelErr || !hotelData.length) {
      return res.json({ success: false });
    }

    if (!hotelData || hotelData.length === 0) {
      console.error("No hotel matched UUID:", propId);
      return res.json({ success: false });
    }

    // ✅ UPDATE ROOM (UUID SAFE)
    const { data: roomData, error: roomErr } = await supabase
      .from("rooms")
      .update({
        room_type: type,
        price_per_night: priceRange
      })
      .eq("hotel_id", propId)   // ✅ FK is UUID
      .select();

    if (roomErr) {
      console.error("Room update error:", roomErr);
      return res.json({ success: false });
    }

    if (!roomData || roomData.length === 0) {
      console.error("No room matched hotel UUID:", propId);
      return res.json({ success: false });
    }

    return res.json({
      success: true,
      message: "✅ Property updated successfully"
    });

  } catch (err) {
    console.error("EDIT PROPERTY ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
