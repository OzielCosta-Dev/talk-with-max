# Talk with Max 🎙️

**Talk with Max** is a web app for practicing spoken English. You talk with **Max**,
a friendly (fictional) tech founder. He keeps the conversation going and corrects your
mistakes. He also saves new words for you and gives you feedback at the end of each session.

It was made for Brazilian Portuguese speakers, so some corrections include a short
hint in Portuguese 🇧🇷.

## What you can do

- 💬 **Chat with Max** by typing or by **holding the microphone button** and speaking.
- 🔊 **Listen to Max.** His replies are read aloud. You can turn the voice off or replay a message.
- ✏️ **See your corrections.** They appear under each of your messages, with a short explanation.
- 🎭 **Choose a conversation mode:** Free talk, Job interview, Restaurant, Airport & travel,
  My work (electrical work at night), Small talk.
- 🎓 **Use "Teach me" mode.** Max teaches you a phrase or grammar point, then you practice it.
- 📒 **Review your words.** New words are saved automatically, and you can review them with flashcards.
- 📈 **Finish a session to get feedback:** what you did well, your 3 most common mistakes,
  and what to practice next. All summaries are saved on the *Progress* page.
- ⚙️ **Change the settings:** your level, Max's voice and speed, corrections on/off, and light/dark theme.

---

## 1. What you need

- **Node.js 20 or newer** → download it from <https://nodejs.org> (choose "LTS").
  To check your version, open a terminal and type `node -v`.
- **A Claude API key** → create one at <https://platform.claude.com/> (Settings → API Keys).
  Using the API costs money, but each message costs very little.
- **Google Chrome or Microsoft Edge** for voice input. (Firefox doesn't support speech
  recognition yet. You can still type in Firefox.)

## 2. Install

Open a terminal in the project folder and run:

```bash
npm install
```

This one command installs everything for both the server and the app.

## 3. Add your API key

1. Copy the file `.env.example` and name the copy `.env`:
   - Windows (PowerShell): `Copy-Item .env.example .env`
   - Mac / Linux: `cp .env.example .env`
2. Open `.env` and paste your key:

   ```
   ANTHROPIC_API_KEY=sk-ant-...your key...
   ```

> 🔒 **Keep your key secret.** The `.env` file is listed in `.gitignore`, so git won't upload it.
> Never share your key and never put it in the frontend code.

## 4. Run the app

```bash
npm run dev
```

This starts two programs at the same time:

| Program  | Address                 | What it does                                        |
| -------- | ----------------------- | --------------------------------------------------- |
| server   | http://localhost:3001   | Talks to the Claude API (keeps your key safe)       |
| client   | http://localhost:5173   | The app you use in the browser                      |

Open **<http://localhost:5173>** in Chrome or Edge. The first time you use the microphone,
the browser asks for permission. Click **Allow**.

To stop the app, press `Ctrl + C` in the terminal.

---

## How the project is organized

```
talk-with-max/
├── package.json          ← root: "npm run dev" starts server + client together
├── .env.example          ← template for your API key (copy it to .env)
├── server/               ← BACKEND (Node.js + Express + TypeScript)
│   └── src/
│       ├── index.ts      ← the web server and its /api routes
│       ├── claude.ts     ← the only file that calls the Claude API
│       ├── prompts.ts    ← Max's personality, levels and conversation modes
│       └── schemas.ts    ← the JSON shapes Claude must return
└── client/               ← FRONTEND (React + Vite + TypeScript)
    └── src/
        ├── App.tsx       ← main component: navigation and shared data
        ├── pages/        ← Chat, Words (vocabulary), Progress, Settings
        ├── components/   ← message bubble, corrections, mic button, ...
        ├── hooks/        ← voice input, Max's voice, localStorage
        ├── lib/          ← calling the server, saving data
        └── styles.css    ← all the styles (with dark mode)
```

### How a message travels

1. You speak. The browser's **SpeechRecognition** turns your voice into text.
2. The React app sends the conversation to **our server** (`POST /api/chat`).
3. The server adds Max's instructions (the "system prompt") and calls **Claude**
   (`claude-sonnet-5-5`), asking for JSON like this:
   ```json
   {
     "reply": "Max's answer",
     "corrections": [{ "original": "...", "corrected": "...", "explanation": "...", "ptHint": "..." }],
     "compliment": "Great job! (only when there are no mistakes)",
     "newWords": [{ "word": "...", "meaning": "...", "example": "..." }]
   }
   ```
4. The app shows the reply and the corrections. **speechSynthesis** reads the reply aloud,
   and the new words are saved in your notebook.

### Where your data is saved

Your vocabulary, session summaries, settings and current conversation are saved in your
**browser's localStorage**. They stay on your computer. If you clear your browser data,
they will be deleted.

---

## Useful commands

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Start the server and the app (development mode)      |
| `npm run typecheck` | Check the TypeScript code for errors                 |
| `npm run build`     | Build everything for production                      |
| `npm start -w server` | After a build: run the server, which also serves the app on http://localhost:3001 |

## Customizing Max

- **Max's personality and rules:** edit `MAX_PERSONA` in `server/src/prompts.ts`.
- **Opening lines and mode instructions:** edit `MODES` in the same file.
- **"Teach me" topics:** edit `TEACH_TOPICS` in the same file.
- **The model:** change `MODEL` in `server/src/claude.ts`.

## Troubleshooting

| Problem | Solution |
| ------- | -------- |
| "The API key is missing" | Create the `.env` file (step 3) and restart `npm run dev`. |
| "Your API key is missing or invalid" | Check that you copied the whole key with no extra spaces. |
| "Can't reach the server" | Make sure `npm run dev` is running and that nothing else is using port 3001. |
| The microphone button doesn't appear | Use Chrome or Edge. |
| "Microphone access was blocked" | Click the 🔒 icon in the address bar and allow the microphone. |
| Max's voice sounds robotic | Go to Settings → Voice and try other voices. Edge has very natural voices (for example "Microsoft Andrew Online"). |
| Max doesn't speak | Check that the 🔊 button in the chat is on and that your volume is up. |

Have fun practicing! 🚀
