import { NextResponse } from 'next/server';
import { findUserByEmail, verifyUserPassword, setSessionCookie, createUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email || body.username || 'admin@local.com';
    const password = body.password || 'password123';

    console.log(`[API Login] Attempting login/auto-registration for: ${email}`);

    // Try to find the user
    let user = await findUserByEmail(email);
    if (!user) {
      console.log(`[API Login] User not found. Auto-registering: ${email}`);
      try {
        user = await createUser(email, password);
        console.log(`[API Login] User registered successfully: ${user.id}`);
      } catch (err: any) {
        console.error(`[API Login] Auto-registration failed:`, err);
        return NextResponse.json({ error: `Registration failed: ${err.message}` }, { status: 400 });
      }
    } else {
      console.log(`[API Login] User found: ${user.id}. Verifying password...`);
      const isValid = await verifyUserPassword(user.id, password);
      if (!isValid) {
        console.log(`[API Login] Invalid password for: ${email}`);
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      console.log(`[API Login] Password verified successfully for: ${user.id}`);
    }

    // Set the session cookie
    await setSessionCookie({
      sub: user.id,
      email: user.primaryEmail || email,
      name: user.username || user.name || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(`[API Login] Critical error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
