import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the requesting user is a superadmin
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is superadmin
    const { data: backofficeUser, error: roleError } = await supabase
      .from('backoffice_users')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !backofficeUser || backofficeUser.role !== 'superadmin') {
      throw new Error('Unauthorized - Not a superadmin');
    }

    // Get the user IDs from the request
    const { userIds } = await req.json();
    if (!Array.isArray(userIds)) {
      throw new Error('Invalid request format');
    }

    // Fetch user details for all provided IDs
    const userDetails = [];
    for (const userId of userIds) {
      const { data: userData, error: userError } = await supabase.auth.admin
        .getUserById(userId);

      if (!userError && userData.user) {
        userDetails.push({
          id: userData.user.id,
          email: userData.user.email,
        });
      }
    }

    return new Response(
      JSON.stringify({ users: userDetails }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: error.message.includes('Unauthorized') ? 403 : 400,
      }
    );
  }
});