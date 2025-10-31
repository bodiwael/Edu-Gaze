# EduGaze Troubleshooting Guide

## Student Dashboard - Emotion Detection Not Working

### Problem
Camera opens and session time counts, but emotions and blinks are not detected.

### Solution Steps

#### Step 1: Check Browser Console
1. Open the student dashboard
2. Press `F12` or right-click and select "Inspect"
3. Go to the "Console" tab
4. Look for error messages or loading status

**What you should see:**
```
Emotion tracker script loaded
Document already loaded, starting initialization immediately
Starting tracker initialization...
TensorFlow loaded: true
Face detection loaded: true
✓ All libraries loaded successfully
✓ Creating EmotionTracker instance...
✓ Calling init()...
✓ EduGaze initialized successfully
✓✓✓ Emotion Tracker fully initialized and running!
```

#### Step 2: Check Network Tab
1. In Developer Tools, go to "Network" tab
2. Refresh the page
3. Look for these files loading successfully:
   - `tfjs-core`
   - `tfjs-converter`
   - `tfjs-backend-webgl`
   - `face_mesh`
   - `face-landmarks-detection`

**If any fail to load:**
- Check your internet connection
- Try a different browser
- Clear browser cache

#### Step 3: Verify File Structure
Make sure all these files are in the same directory:
```
edugaze/
├── index.html
├── student.html
├── emotion-tracker.js
├── shared-styles.css
└── (other files...)
```

#### Step 4: Check Browser Compatibility
**Supported Browsers:**
- ✅ Chrome 90+ (Recommended)
- ✅ Edge 90+ (Recommended)
- ✅ Firefox 88+
- ✅ Safari 14.5+

**If using an older browser:**
- Update to the latest version
- Or try Chrome/Edge

#### Step 5: Camera Permissions
1. Make sure you clicked "Allow" for camera access
2. Check browser settings:
   - Chrome: Settings → Privacy → Site Settings → Camera
   - Firefox: Preferences → Privacy & Security → Permissions
3. Make sure no other application is using the camera

#### Step 6: Check for Errors
**Common Errors and Solutions:**

**Error: "TensorFlow failed to load"**
- Solution: Check internet connection, CDN might be blocked
- Try refreshing the page
- Check if firewall/antivirus is blocking CDN access

**Error: "Face detection library failed to load"**
- Solution: Same as above
- The page needs internet to load AI libraries from CDN

**Error: "Camera not supported"**
- Solution: Use a supported browser
- Make sure you're not on a mobile device (some features may not work)

**Error: "Failed to initialize camera"**
- Solution: Close other apps using camera
- Check camera permissions
- Restart browser

#### Step 7: Run a Quick Test
Open student.html and type this in the console:
```javascript
console.log('TensorFlow:', typeof tf !== 'undefined');
console.log('Face Detection:', typeof faceLandmarksDetection !== 'undefined');
console.log('Tracker:', typeof window.emotionTracker !== 'undefined');
```

**Expected Output:**
```
TensorFlow: true
Face Detection: true
Tracker: true
```

**If any show `false`:**
- The library didn't load properly
- Refresh the page
- Check your internet connection

#### Step 8: Check WebGL Support
The emotion tracker requires WebGL for GPU acceleration.

Test it:
1. Go to: https://get.webgl.org/
2. You should see a spinning cube
3. If not, your browser doesn't support WebGL

**To enable WebGL in Chrome:**
1. Go to `chrome://settings/`
2. Search for "hardware acceleration"
3. Enable "Use hardware acceleration when available"
4. Restart browser

#### Step 9: Local Server (Recommended)
Some browsers block certain features when opening HTML files directly.

**Run a local server:**

Python:
```bash
python -m http.server 8000
```

Then open: `http://localhost:8000/student.html`

Node.js:
```bash
npx http-server
```

#### Step 10: Clear Cache and Reload
1. Press `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh the page with `Ctrl+F5` (hard refresh)

### Still Not Working?

#### Debug Mode
Add this to your console to see detailed logs:
```javascript
localStorage.setItem('debug', 'true');
```

Then refresh the page. You'll see much more detailed logging.

#### Check Face Detection
Make sure:
- Your face is visible in the camera
- You're looking at the camera
- Room has adequate lighting
- You're 40-60cm from the camera
- Face is not too tilted

#### Manual Initialization Test
Try initializing manually in the console:
```javascript
window.emotionTracker = new EmotionTracker();
window.emotionTracker.init();
```

Watch the console for any error messages.

## Other Common Issues

### Issue: Page Loads But Nothing Happens
**Solution:** Check if JavaScript is enabled in your browser

### Issue: Styles Look Broken
**Solution:** Make sure `shared-styles.css` is in the same directory

### Issue: Can't Login
**Solution:** Use the correct access codes:
- STUDENT1
- TEACHER1
- PARENT1
- ADMIN1

### Issue: Report Page Shows "No Data"
**Solution:** You need to complete a session first with emotion tracking working

### Issue: Slow Performance
**Solution:**
- Close other tabs/applications
- Enable hardware acceleration
- Update graphics drivers
- Try a different browser

## Browser-Specific Issues

### Chrome/Edge
- Usually works best
- Make sure hardware acceleration is enabled
- Clear cache if issues persist

### Firefox
- May need to enable WebGL manually
- Go to `about:config`
- Search for `webgl.force-enabled`
- Set to `true`

### Safari
- Make sure you're on macOS 11+ or iOS 14.5+
- Camera permissions must be explicitly granted
- May have slower performance than Chrome

## Performance Tips

1. **Close unnecessary tabs** - Each tab uses memory
2. **Use wired internet** - More stable than WiFi for loading libraries
3. **Good lighting** - Helps face detection accuracy
4. **Stable position** - Don't move around too much
5. **Modern hardware** - Integrated graphics work, dedicated GPU is better

## Getting Help

If you've tried everything above and it still doesn't work:

1. **Note your browser and version**
   - Chrome: `chrome://version`
   - Firefox: `about:support`

2. **Copy console errors**
   - Press F12, go to Console
   - Copy any red error messages

3. **Check system requirements**
   - Modern browser (2023+)
   - WebGL support
   - Camera access
   - Internet connection for first load

## Success Indicators

You know it's working when you see:
- ✅ Green "System ready" alert appears
- ✅ Emotion bars start moving (not stuck at 0%)
- ✅ Blink count increases when you blink
- ✅ Engagement score updates
- ✅ Console shows "Emotion Tracker fully initialized"

## Emergency Reset

If all else fails:
1. Close browser completely
2. Clear ALL browser data (cache, cookies, everything)
3. Restart computer
4. Open browser fresh
5. Navigate to `index.html` again
6. Try with a different browser (Chrome recommended)

---

**Most Common Solution:** Run from a local server instead of opening the HTML file directly!
