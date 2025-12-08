import { supabase } from "../config/supabase.js";

export const addReview = async (req, res) => {
  const hotelId = req.params.hotelId;
  const { rating, review_text } = req.body;
  const userId = req.user?.id;

  // If review text is empty, then return
  if(!review_text || review_text.trim().length <= 2) return res.status(401).json({error: "Enter valid review"});

  //const userId = req.user?.id; // or wherever you get the authenticated user ID
  if (!userId) return res.status(401).json({ error: "Login required" });

  // 1️⃣ Call the SQL function to get the user's name
  const { data: nameData, error: nameErr } = await supabase
  .rpc("get_username", { uid: userId });

if (nameErr) {
  console.error(nameErr);
  return res.status(500).json({ error: "Failed to fetch user name" });
}

const username = nameData;


  // 2️⃣ Insert review with the retrieved email
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      hotel_id: hotelId,
      rating,
      review_text,
      user_id: userId,
      user_email: username
    })
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ success: true, review: data[0] });

  /*const { data, error } = await supabase
    .from("reviews")
    .insert([{ hotel_id: hotelId, user_id: userId, rating, review_text }]);

  if (error) return res.status(400).json({ error });

  res.json({ success: true, data });*/
};
