# Ear Practice Website

A lightweight ear training web app built with plain HTML, CSS, and JavaScript.

## Features

- Interval, chord, and scale ear training exercises
- User authentication via Firebase Auth
- Firestore-backed profile and progress sync
- Daily streak tracking and activity graph
- Profile discovery search tab for finding other musicians
- Dark / light / auto theme support

## Files

- `index.html` — main single-page application structure and page sections
- `style.css` — app styling and responsive layout
- `script.js` — application logic, UI handling, Firebase integration, and search

## Running locally

1. Open `index.html` in your browser.
2. For full Firebase functionality, host the app on a local server or deploy it with your Firebase config.

## Notes

- The project currently uses Firebase compat SDK scripts for Auth and Firestore.
- Search results are loaded from Firestore and displayed in the dedicated `Search` page.
- Progress is saved locally for guests and synced to Firestore for signed-in users.
