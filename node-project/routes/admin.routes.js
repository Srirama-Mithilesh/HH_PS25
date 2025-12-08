import { Router } from 'express';

import {
    bookingsTable,
    getPropertyById,
    deleteProperty,
    properties
} from '../controllers/admin.controller.js';

const router = Router();

router.get('/bookings/:userId', bookingsTable);
router.get('/properties/:userId', properties);

// Get a single property by ID (for Edit)
router.get("/properties/id/:id", getPropertyById);

// Delete a property
router.delete("/properties/delete/:id", deleteProperty);


export default router;