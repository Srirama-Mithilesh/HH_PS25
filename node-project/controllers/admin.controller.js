import { supabase } from '../config/supabase.js';

export async function bookingsTable(req, res) {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({ message: "Admin ID is required" });
    }

    const { data: hotels, error: hotelsError } = await supabase
      .from("hotels")
      .select(`id`)
      .eq("owner_id", userId);

    if (hotelsError) return res.status(500).json(hotelsError);

    const hotelIds = hotels.map(h => h.id);

    if (hotelIds.length === 0) {
      return res.status(200).json([]); // admin has no hotels → no bookings
    }

    // 2. Get rooms under these hotels
    const { data: hotel, error: hotelError } = await supabase
      .from("hotels")
      .select("id, name")
      .in("id", hotelIds);

    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("id")
      .in("hotel_id", hotelIds);

    if (roomsError) return res.status(500).json(roomsError);

    const roomIds = rooms.map(r => r.id);

    if (roomIds.length === 0) {
      return res.status(200).json([]); // no rooms → no bookings
    }
    // 3. Get bookings for these rooms
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("*")
      .in("room_id", roomIds);

    const bookingDetails = await Promise.all(
      bookings.map(async (booking) => {
        const { data: rooms, error: roomError } = await supabase
          .from('rooms')
          .select(`hotel_id`)
          .eq('id', booking.room_id);

        if (roomError) throw roomError;

        const { data:hotels, error:hotelError } = await supabase
          .from('hotels')
          .select('id, name')
          .eq('id', rooms[0].hotel_id)

        if (hotelError) throw hotelError;


        return {
          hotel_id: hotels[0].id,
          name: hotels[0].name,
          ...booking,
        };
      })
    );

    if (bookingsError) return res.status(500).json(bookingsError);
    // 4. Return ONLY bookings (flat list)
    return res.status(200).json({
      hotels: hotel,
      bookings: bookingDetails,
    });



  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function properties(req, res) {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({ message: "Admin ID is required" });
    }

    // 1. Get hotels owned by admin
    const { data: adminData, error: adminError } = await supabase
      .from("admin")
      .select("id")
      .eq("owner_id", userId)
      .single();

    const adminId = adminData?.id;

    const { data: hotels, error: hotelsError } = await supabase
      .from("hotels")
      .select(`*`)
      .eq("owner_id", userId);

    const hotelDetails = await Promise.all(
      hotels.map(async (hotel) => {
        const { data: rooms, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('hotel_id', hotel.id);

        if (roomError) throw roomError;

        return {
          ...hotel,
          rooms: rooms, 
        };
      })
    );

    if (hotelsError) return res.status(500).json(hotelsError);

    return res.status(200).json(hotelDetails);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function getPropertyById(req, res) {
  try {
    const id = req.params.id;

    const { data, error } = await supabase
      .from("hotels")
      .select(`*, rooms (*)`)   // fetch rooms also
      .eq("id", id)
      .single();

    if (error) return res.status(500).json(error);

    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function deleteProperty(req, res) {
  try {
    const id = req.params.id;

    // delete rooms first (foreign key)
    await supabase.from("rooms").delete().eq("hotel_id", id);

    // delete hotel
    const { error } = await supabase
      .from("hotels")
      .delete()
      .eq("id", id);

    if (error) return res.status(500).json(error);

    return res.status(200).json({ message: "Property deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}