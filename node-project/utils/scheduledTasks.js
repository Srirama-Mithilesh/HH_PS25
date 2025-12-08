import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export function startScheduledTasks() {
  // Runs every day at midnight
  cron.schedule('0 0 * * *', async () => {
    const { data, error } = await supabase
      .from('rooms')
      .update({ is_available: true })
      .lt('check_out', new Date());

    if (error) console.error('Error updating availability:', error);
    else console.log('Availability updated for rooms:', data.length);
  });
}
