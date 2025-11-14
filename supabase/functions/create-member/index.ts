import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'super_admin')) {
      throw new Error('Unauthorized: Admin access required')
    }

    const { email, password, firstName, lastName, phoneNumber } = await req.json()

    // Generate member ID
    const { data: memberIdData, error: memberIdError } = await supabaseAdmin.rpc('generate_member_id')
    if (memberIdError) throw memberIdError

    // Create user with email already confirmed
    const { data: newUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
      }
    })

    if (signUpError) throw signUpError

    // The profile will be created automatically by the trigger
    // but we need to ensure email_verified is set to true
    await supabaseAdmin
      .from('profiles')
      .update({ email_verified: true })
      .eq('id', newUser.user.id)

    return new Response(
      JSON.stringify({ success: true, userId: newUser.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating member:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
