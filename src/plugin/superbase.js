import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://obqojequpinlinynnisz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9icW9qZXF1cGlubGlueW5uaXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwNzgwNDEsImV4cCI6MjA0NzY1NDA0MX0.H65wWMxsy9XtRKMJg6FyUBVDSrYRJ7Y9kjY_JSpgbuY'

export const supabase = createClient(supabaseUrl, supabaseKey)