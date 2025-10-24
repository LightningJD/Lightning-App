# ☁️ Cloudinary Setup Guide for Lightning App

## Step 1: Create Cloudinary Account (5 minutes)

1. Go to https://cloudinary.com/users/register_free
2. Sign up with your email (or use Google sign-in)
3. **FREE TIER INCLUDES:**
   - 25GB storage
   - 25GB bandwidth per month
   - Image transformations
   - No credit card required

## Step 2: Get Your Credentials (2 minutes)

1. After signing up, you'll be taken to the **Dashboard**
2. At the top of the dashboard, you'll see:
   ```
   Cloud name: your_cloud_name
   API Key: 123456789012345
   API Secret: abcdefghijklmnopqrstuvwxyz
   ```
3. **Copy your Cloud Name** - you'll need this!

## Step 3: Create Upload Preset (3 minutes)

An upload preset defines how images are processed when uploaded.

1. In Cloudinary dashboard, click **Settings** (gear icon) in top right
2. Click **Upload** tab in left sidebar
3. Scroll down to **Upload presets** section
4. Click **Add upload preset**
5. Configure:
   - **Preset name:** `lightning_avatars`
   - **Signing mode:** `Unsigned` (important!)
   - **Folder:** `lightning/avatars`
   - **Transformation:**
     - Width: 800
     - Height: 800
     - Crop: `Limit` (keeps aspect ratio)
     - Quality: `Auto`
     - Format: `Auto`
6. Click **Save**
7. **Copy the preset name:** `lightning_avatars`

## Step 4: Add to Environment Variables

1. Open `/Users/jordyndoanne/lightning/.env.local`
2. Add these lines:
   ```
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=lightning_avatars
   ```
3. Replace `your_cloud_name` with your actual cloud name from Step 2

**Example .env.local:**
```
# Clerk (existing)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Supabase (existing)
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Cloudinary (NEW)
VITE_CLOUDINARY_CLOUD_NAME=dxyz123abc
VITE_CLOUDINARY_UPLOAD_PRESET=lightning_avatars
```

## Step 5: Restart Dev Server

1. Stop the dev server (Ctrl+C or kill the process)
2. Restart: `npm run dev`
3. Environment variables will now be loaded

## Step 6: Test Upload (After Code Implementation)

1. Click "Edit Profile" in settings
2. Click camera icon to upload image
3. Select an image
4. Upload should complete in 2-5 seconds
5. Image appears immediately

## Troubleshooting

### "Invalid cloud_name" Error
- Check your cloud name in .env.local matches Cloudinary dashboard
- Make sure you restarted the dev server after adding env vars

### "Upload preset not found" Error
- Verify preset name is exactly `lightning_avatars`
- Make sure signing mode is `Unsigned`
- Check you saved the preset in Cloudinary dashboard

### "CORS Error"
- In Cloudinary Settings → Security → Allowed fetch domains
- Add: `http://localhost:5173` and `http://localhost:5174`

### Image Not Appearing
- Check browser console for errors
- Verify image URL is saved to database
- Check Network tab to see if image loads

## Image Upload Limits (Free Tier)

- **Max file size:** 10MB
- **Monthly storage:** 25GB
- **Monthly bandwidth:** 25GB
- **Transformations:** Unlimited

**For 10,000 users with profile pictures (~200KB each):**
- Storage needed: 2GB
- Well within free tier! 🎉

## Next Steps

After completing this setup:
1. The ImageUploadButton component will work
2. Profile pictures will upload to Cloudinary
3. Images will be optimized automatically
4. URLs saved to Supabase

## Resources

- Cloudinary Dashboard: https://cloudinary.com/console
- Upload Widget Docs: https://cloudinary.com/documentation/upload_widget
- React SDK Docs: https://cloudinary.com/documentation/react_integration

---

**Estimated Setup Time:** 10 minutes
**Cost:** FREE (no credit card required)
