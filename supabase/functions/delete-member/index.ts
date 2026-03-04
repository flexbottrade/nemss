import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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

    // Verify the requesting user is an admin or financial secretary
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

    if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'super_admin' && roleData.role !== 'financial_secretary')) {
      throw new Error('Unauthorized: Admin or Financial Secretary access required')
    }

    const { memberId } = await req.json()

    if (!memberId) {
      throw new Error('Member ID is required')
    }

    // Prevent deleting yourself
    if (memberId === user.id) {
      throw new Error('You cannot delete your own account')
    }

    // Get the member's profile info before deletion for record keeping
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, member_id')
      .eq('id', memberId)
      .single()

    const memberLabel = profile 
      ? `[Deleted: ${profile.first_name} ${profile.last_name} (${profile.member_id})]`
      : '[Deleted Member]'

    // Update payment records with admin_note to preserve member identity
    await Promise.all([
      supabaseAdmin.from('dues_payments').update({ admin_note: supabaseAdmin.rpc ? memberLabel : memberLabel }).eq('user_id', memberId).is('admin_note', null),
      supabaseAdmin.from('event_payments').update({ admin_note: memberLabel }).eq('user_id', memberId).is('admin_note', null),
      supabaseAdmin.from('donation_payments').update({ admin_note: memberLabel }).eq('user_id', memberId).is('admin_note', null),
    ].map(p => p.catch(() => {})))

    // For records that already have admin_note, prepend the member label
    await Promise.all([
      supabaseAdmin.from('dues_payments').update({ admin_note: memberLabel }).eq('user_id', memberId),
      supabaseAdmin.from('event_payments').update({ admin_note: memberLabel }).eq('user_id', memberId),
      supabaseAdmin.from('donation_payments').update({ admin_note: memberLabel }).eq('user_id', memberId),
    ].map(p => p.catch(() => {})))

    // Delete the user from auth (cascade will delete profile, payment user_id becomes NULL)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(memberId)

    if (deleteError) throw deleteError

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error deleting member:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})