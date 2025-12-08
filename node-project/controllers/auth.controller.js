// controllers/auth.controller.js
import { supabase } from '../config/supabase.js';

/**
 * POST /api/signup
 * Body: { name, email, password }
 */
export async function signupController(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    // Create user in Supabase Auth ONLY
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || null } // stored in user_metadata
      }
    });

    if (error) {
      return res.status(400).json({
        message: error.message || 'Signup failed'
      });
    }

    const { user, session } = data;

    return res.status(201).json({
      message: 'Signup successful',
      user,
      token: session?.access_token || null,
      emailConfirmationRequired: !session
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * POST /api/login
 * Body: { email, password }
 */
export async function loginController(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        message: error.message || 'Invalid login'
      });
    }

    const { user, session } = data;

    return res.status(200).json({
      message: 'Login successful',
      token: session.access_token,
      user
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Login failed' });
  }
}

/**
 * GET /api/profile
 */
export async function profileController(req, res) {
  try {
    return res.status(200).json({
      message: 'Profile loaded',
      user: req.user
    });

  } catch (err) {
    console.error('Profile error:', err);
    return res.status(500).json({ message: 'Could not fetch profile' });
  }
}


export async function updateProfileController(req, res) {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;

    if (!name && !email) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    // Using the service_role client (admin privileges)
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      {
        email: email || undefined,
        user_metadata: {
          name: name || req.user.user_metadata?.name
        }
      }
    );

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ success: true, user: data.user });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// GET /api/is-admin
export async function isAdminController(req, res) {
  try {
    // Always read email fresh from Supabase instead of req.user
    const token = req.headers.authorization?.replace("Bearer ", "");

    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      console.log("AUTH ERROR:", authError);
      return res.json({ isAdmin: false });
    }

    let userEmail = authData.user.email;
    if (!userEmail) {
      return res.json({ isAdmin: false });
    }

    userEmail = userEmail.trim().toLowerCase();

    // Admin lookup
    const { data, error } = await supabase
      .from('admin')
      .select('email')
      .eq('email', userEmail)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.log("Supabase admin lookup error:", error);
    }

    // console.log("ADMIN CHECK DATA:", data);

    const isAdmin = !!data;

    return res.json({ isAdmin });

  } catch (err) {
    console.error("isAdminController error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}