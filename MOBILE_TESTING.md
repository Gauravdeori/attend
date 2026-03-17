# 📱 Mobile Testing Guide for MyAttendanceHub

To test features like **Browser Notifications** and **Auto-Attendance Prompts** on your physical mobile device, follow these steps.

## 1. Local Tunneling (Recommended)
You can use tools like `localtunnel` or `ngrok` to expose your local development server to the internet.

### Using LocalTunnel
1. In your project terminal, start the dev server:
   ```bash
   npm run dev
   ```
2. In a NEW terminal window, run localtunnel:
   ```bash
   npx localtunnel --port 5173
   ```
3. Copy the URL provided (e.g., `https://slimy-cats-jump.loca.lt`).
4. Open this URL on your phone's browser.

### Using ngrok
1. Install ngrok if you haven't: `npm install -g ngrok`
2. Start the dev server: `npm run dev`
3. Expose the port:
   ```bash
   ngrok http 5173
   ```
4. Copy the forwarding URL and open it on your phone.

---

## 2. Notification Permissions & PWA
For the **Auto-Attendance Prompt** and **Class Reminders** to work reliably on mobile, installing as a PWA is highly recommended.

### Why Install as PWA?
- **Android**: Installing as a PWA allows the app to request "Notification Permissions" more effectively and run service workers in the background.
- **iOS**: iOS now supports Web Push Notifications, but only if the app is **added to the home screen**.

### Installation Steps
- **Android (Chrome)**: 
    1. Open the URL in Chrome.
    2. A prompt "Add MyAttendanceHub to Home screen" should appear at the bottom.
    3. If not, tap the **three dots (⋮)** and select **Install app**.
- **iOS (Safari)**: 
    1. Open the URL in Safari.
    2. Tap the **Share** button (up arrow in a square).
    3. Scroll down and tap **Add to Home Screen**.
    4. Open the new "AttendanceHub" app from your home screen.

---

## 3. Background Reliability
- **Battery Optimization**: On Android, you may need to set the app to "Unrestricted" battery usage if you notice notifications are delayed.
- **App Switching**: On both platforms, the PWA stays "active" in the background better than a standard browser tab.

## 3. Testing the "Auto-Attendance" Prompt
The prompt triggers at the **exact end time** of a class. To test it quickly:
1. Go to the "Schedule" tab.
2. Edit a class or add a new one that ends in **1 minute** from now.
3. Keep the app open (or running in the background if PWA is installed).
4. Wait for the class end time—you should receive a notification and see the "Did you attend?" popup.

---

## 4. UI Optimization
The app is built with **Shadcn UI** and is fully responsive. 
- Use the **Dashboard** to see current/next classes.
- Use the **Timeline** scroll on mobile to see your full day.
- Check the **Bunk Budget** card to quickly see if you can skip a class while on the go.
