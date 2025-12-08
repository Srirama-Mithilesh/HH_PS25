// controllers/listing.controller.js
import { supabase } from "../config/supabase.js";

// ------------------------------
// Helper: Upload file to Supabase Storage
// ------------------------------
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


// ------------------------------
// Promote user to admin table if not exists
// ------------------------------
async function promoteUserToAdmin(req) {
    const email = req.userEmail;
    const name = req.userName;

    // Check if already admin
    const { data: existing } = await supabase
        .from("admin")
        .select("id")
        .eq("email", email)
        .maybeSingle();

    // Insert if new
    if (!existing) {
        await supabase.from("admin").insert([
            {
                name,
                email
            }
        ]);
    }
}

// ------------------------------
// CASUAL LISTING
// ------------------------------
export async function createCasualListing(req, res) {
    console.log("FILES:", req.files);
    try {
        const { title, type, price, guests, city, address } = req.body;
        // Upload all photos
        // First upload all images to rooms-images bucket
        const photoUrls = [];

        for (const file of req.files) {
            const url = await uploadToSupabase(file, "rooms-images");
            photoUrls.push(url);
        }

        // Hotel image = first photo but stored in hotel-image
        const hotelImageUrl = await uploadToSupabase(req.files[0], "hotel-image");


        // Insert hotel
        const { data: hotelData, error: hotelErr } = await supabase
            .from("hotels")
            .insert([
                {
                    name: title,
                    city,
                    address,
                    image: photoUrls[0] || null,
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
                    price_per_night: price,
                    max_guests: parseInt(guests, 10),
                    images: photoUrls
                }
            ]);

        if (roomErr) throw roomErr;

        // Promote user to admin
        await promoteUserToAdmin(req);

        return res.json({
            success: true,
            message: "Casual listing created successfully",
            hotelId,
        });

    } catch (err) {
        console.error("CASUAL LISTING ERROR:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
}

// ------------------------------
// PROFESSIONAL LISTING
// ------------------------------
export async function createProfessionalListing(req, res) {
    try {
        const { businessName, address, city } = req.body;

        // Upload images
        const photoUrls = [];
        for (const file of req.files) {
            const url = await uploadToSupabase(file, "hotel-image");
            photoUrls.push(url);
        }

        // Insert hotel
        const { data: hotelData, error: hotelErr } = await supabase
            .from("hotels")
            .insert([
                {
                    name: businessName,
                    city,
                    address,
                    image: photoUrls[0] || null,
                    owner_id: req.userId,
                }
            ])
            .select();

        if (hotelErr) throw hotelErr;

        const hotelId = hotelData[0].id;

        // Promote user to admin
        await promoteUserToAdmin(req);

        return res.json({
            success: true,
            message: "Professional listing created successfully",
            hotelId
        });

    } catch (err) {
        console.error("PROFESSIONAL LISTING ERROR:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
