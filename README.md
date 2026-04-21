# 📦 Connect 4 Game

A modern **Connect 4** game built with **React + Vite**, featuring a simple UI and AI opponent (Minimax).

---

# 🎮 About the Game

Connect 4 is a classic two-player strategy game where players take turns dropping colored discs into a grid.  
The first player to connect **4 discs in a row (horizontal, vertical, or diagonal)** wins.

---

# ✨ Features

- 👤 Player vs AI (Minimax algorithm)
- 🎯 Smart move detection
- ⚡ Fast React + Vite performance
- 📱 Responsive design (mobile & desktop)
- 🎨 Clean UI

---

# 🚀 Live Demo

Play the game here:

👉 https://anasemadanas.github.io/connect-4/

---

# 🛠️ Tech Stack

- React  
- Vite  
- JavaScript (ES6+)  
- CSS  
- Minimax Algorithm (AI)

---

# 💻 Run Locally

Start development server:

```bash
npm run dev
```

Then open:

http://localhost:5173

---

# 🏗️ Build for Production

```bash
npm run build
```

Preview build locally:

```bash
npm run preview
```

---

# 🌐 Deployment (GitHub Pages)

This project is deployed using GitHub Pages.

Steps:
- Push code to GitHub repository
- Go to Settings → Pages
- Set source to: GitHub Actions
- Deployment runs automatically

---

# ⚙️ Important Vite Config

Make sure your vite.config.js contains:

```js
export default defineConfig({
  plugins: [react()],
  base: '/connect-4/', // must match repository name
})
```

---

# 🧠 Game Rules

- Players take turns dropping discs
- First to connect 4 wins
- Connections can be:
  - Horizontal
  - Vertical
  - Diagonal

---

# 🤖 AI System

The AI uses the Minimax algorithm, which:

- Simulates future moves
- Chooses the best possible outcome
- Provides a challenging opponent

---

# 📁 Project Structure
```
src/
 ├── game logic (Connect 4)
 ├── App.jsx
 ├── main.jsx
```
---

# 👨‍💻 Author

- Created by Zaid Shaheen and Anas Emad.
Under the supervision of Dr. Yazid Al-Sheikh ❤️.

---

# 📌 Notes

- Works best on GitHub Pages or Vercel
- Ensure correct base path if using GitHub Pages
