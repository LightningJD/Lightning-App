# Supabase Configuration

This directory contains SQL files and configuration for the Lightning app's Supabase database.

## Files

### `rls-policies.sql`
Row Level Security policies for all database tables. **Critical for production security.**

## Setup Instructions

### 1. Enable Row Level Security (RLS)

RLS is **essential** for production security. It enforces access control at the database level, even if application-level authorization is bypassed.

**To enable RLS:**

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New query**
5. Copy and paste the entire contents of `rls-policies.sql`
6. Click **Run** (or press Cmd/Ctrl + Enter)

**Verify RLS is enabled:**

```sql
-- Check which tables have RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

Expected result: All tables should have `rowsecurity = true`

---

### 2. Verify Policies Are Working

**Test as different users:**

1. **Test Public Access:**
   - Sign in as User A
   - Try to read User B's public testimony (should **succeed**)
   - Try to read public user profiles (should **succeed**)

2. **Test Private Access:**
   - Sign in as User A
   - Try to read User B's private testimony (should **fail**)
   - Try to update User B's profile (should **fail**)

3. **Test Own Resource Access:**
   - Sign in as User A
   - Try to update own profile (should **succeed**)
   - Try to delete own testimony (should **succeed**)

4. **Test Friend Access:**
   - Sign in as User A (friends with User B)
   - Try to read User B's friend-only testimony (should **succeed**)
   - Try to read User C's friend-only testimony (not friends, should **fail**)

**View all policies:**

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

### 3. Understanding RLS Policies

#### How RLS Works

Row Level Security policies are SQL-based rules that determine which rows a user can:
- **SELECT** (read)
- **INSERT** (create)
- **UPDATE** (modify)
- **DELETE** (remove)

**Key Concepts:**

- `USING (...)`: Determines which existing rows are visible to the user
- `WITH CHECK (...)`: Determines which new/modified rows the user can create
- `auth.uid()`: Returns the currently authenticated user's ID

#### Policy Examples

**Example 1: Users can only read public testimonies or their own**

```sql
CREATE POLICY "Users can read public testimonies"
ON testimonies
FOR SELECT
USING (
  is_public = true           -- Public testimonies
  OR auth.uid() = user_id    -- Own testimonies
  OR auth.uid() IN (         -- Friend's testimonies
    SELECT friend_id FROM friendships
    WHERE user_id = testimonies.user_id
    AND status = 'accepted'
  )
);
```

**Example 2: Users can only update their own profile**

```sql
CREATE POLICY "Users can update own profile"
ON users
FOR UPDATE
USING (auth.uid() = id);
```

**Example 3: Group members can read messages**

```sql
CREATE POLICY "Group members can read messages"
ON group_messages
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM group_members
    WHERE group_id = group_messages.group_id
  )
);
```

---

### 4. Modifying RLS Policies

**To update a policy:**

```sql
-- 1. Drop the existing policy
DROP POLICY "policy_name" ON table_name;

-- 2. Create the new policy
CREATE POLICY "policy_name"
ON table_name
FOR SELECT
USING (...);
```

**To disable a policy temporarily:**

```sql
-- Not recommended for production!
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

**To re-enable:**

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

---

### 5. Common Issues & Troubleshooting

#### Issue: "new row violates row-level security policy"

**Cause:** The user doesn't have permission to insert/update the row.

**Fix:** Check the `WITH CHECK` clause of your INSERT/UPDATE policy.

**Example:**
```sql
-- User tries to insert a testimony for another user
INSERT INTO testimonies (user_id, content)
VALUES ('other-user-id', 'My testimony');
-- ❌ FAILS because auth.uid() != 'other-user-id'

-- User inserts their own testimony
INSERT INTO testimonies (user_id, content)
VALUES (auth.uid(), 'My testimony');
-- ✅ SUCCEEDS
```

---

#### Issue: "permission denied for table"

**Cause:** RLS is not enabled, or the user has no SELECT policy.

**Fix:**
```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Add SELECT policy
CREATE POLICY "Users can read own data"
ON table_name
FOR SELECT
USING (auth.uid() = user_id);
```

---

#### Issue: User can't read any data after enabling RLS

**Cause:** No SELECT policy exists for the table.

**Fix:** RLS policies are **deny-by-default**. You must explicitly grant access.

```sql
-- Grant read access
CREATE POLICY "Users can read public data"
ON table_name
FOR SELECT
USING (is_public = true OR auth.uid() = user_id);
```

---

### 6. Performance Considerations

RLS policies are executed as part of every database query. Complex policies can impact performance.

**Best Practices:**

1. **Index foreign keys** used in policies:
```sql
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_testimonies_user_id ON testimonies(user_id);
```

2. **Avoid expensive subqueries** in policies (use JOINs instead when possible)

3. **Monitor slow queries** in Supabase Dashboard → Database → Query Performance

4. **Use `EXPLAIN ANALYZE`** to check policy performance:
```sql
EXPLAIN ANALYZE
SELECT * FROM testimonies WHERE user_id = 'some-user-id';
```

---

### 7. Admin Access

For administrative tasks (moderating content, viewing reports, etc.), you have two options:

#### Option 1: Service Role Key (Backend Only)

Use Supabase's **service_role** key for admin operations. This bypasses RLS.

**⚠️ WARNING:** Never expose the service_role key in client-side code!

```typescript
// Backend/Edge Function only
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Bypasses RLS
)

// Can read all reports, regardless of RLS policies
const { data: allReports } = await supabaseAdmin
  .from('reports')
  .select('*')
```

#### Option 2: Admin Role Column

Add an `admin_role` column to the `users` table and create admin-specific policies.

```sql
-- Add admin_role column
ALTER TABLE users ADD COLUMN admin_role TEXT;
-- Values: 'admin', 'moderator', or NULL

-- Create admin policy for reports
CREATE POLICY "Admins can read all reports"
ON reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND admin_role IN ('admin', 'moderator')
  )
);
```

---

### 8. Backup & Recovery

**Before applying RLS policies**, back up your database:

1. Go to Supabase Dashboard → Settings → Database
2. Click **Database Backups**
3. Click **Create backup** (manual backup)

**To restore from backup:**

1. Go to Database Backups
2. Find the backup (automatic or manual)
3. Click **Restore**

**⚠️ WARNING:** Restoring a backup will overwrite your current database!

---

### 9. Testing RLS Locally

To test RLS policies locally with Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase locally
supabase init

# Start local Supabase
supabase start

# Apply RLS policies
supabase db reset

# Run tests
npm run test
```

---

### 10. Production Checklist

Before deploying to production with RLS enabled:

- [ ] RLS enabled on all tables (`rls-policies.sql` executed)
- [ ] All policies tested with different user roles
- [ ] Foreign key indexes created for policy performance
- [ ] Database backup created (pre-RLS)
- [ ] Service role key secured (never in client code)
- [ ] Supabase logs reviewed for policy errors
- [ ] Application-level authorization still in place (defense-in-depth)
- [ ] Error handling updated for RLS errors

---

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)

---

## Support

If you encounter issues with RLS policies:

1. Check Supabase Dashboard → Logs → Database Logs
2. Review error messages for policy violations
3. Use `EXPLAIN ANALYZE` to debug slow queries
4. Consult the [Lightning Security Guide](../docs/SECURITY.md)

---

**Last Updated:** 2025-10-25
