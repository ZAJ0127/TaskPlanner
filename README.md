# TaskPlanner

An iPhone task planner. You set up your usual week once, add tasks, and the app fits them around your routine. Chores repeat on their own, and a Time tab shows where your hours went based on what you log.

It's a web app (PWA): plain HTML, CSS and JavaScript, no build step. It works offline once it has loaded, and all data stays on your phone in `localStorage`.

Design mockups: https://claude.ai/artifact/AQBSJFthum7T4L2X14unnw (source in `design/`)

## Install on iPhone

1. Open the app's GitHub Pages URL in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Open it from the home screen icon. It runs full-screen like a normal app.

## Tabs

| Tab | What it does |
|---|---|
| **Today** | Timeline of the day with routine blocks, tasks and chores. "Anytime" list for things with no set time. Free gaps show as "tap to add". Overdue tasks and chores appear here. |
| **Week** | 7-day grid. Tap a day to open it. |
| **Chores** | Repeating chores grouped as Overdue / Today / This week / Later. |
| **Time** | Time you've logged, by category, for a week or month, compared with the previous period. |
| **Routine** | Your usual week, scheduling hours, categories, and backup/restore. |

## Adding a task

1. Type the task and pick how long it takes.
2. Choose how to schedule it:
   - **Find a time for me** suggests up to 3 open slots in the next 2 weeks.
   - **I'll pick a time** lets you choose the day and time, and warns about overlaps.
   - **Just add to a day** puts it on that day's Anytime list.

Tap any task to mark it done, find a new time, move it to Anytime, edit or delete it.

## Chores

- Repeat every N days/weeks/months, or on specific weekdays (e.g. trash Tue & Fri).
- When due: **Find a time for me** (placed in a free gap), **Same time each time**, or **Anytime that day**.
- Marking one done schedules the next. Interval chores count from the day you did it.
- Missed chores go to **Overdue** with a **Find time** button. You can also **Skip** one.

## Time tracking

Nothing is tracked automatically. Time comes only from what you log:

- **Log time** chips (Work, Driving, Sleep, Gym, …) open a quick entry with start and end times. Sleep handles overnight (11 PM → 7 AM).
- When you finish a task or chore, the app asks how long it took. You can add that to Time or skip it.
- You can add your own categories, e.g. Study.

The **Planned vs. actual** card spots tasks or chores that keep taking longer or shorter than planned, and offers to adjust the duration.

## Scheduling rules

- Tasks are only placed between your scheduling hours (default 8 AM to 9 PM) and around your routine.
- "Breathing room" (default 15 min) is kept around everything.
- Suggestions: the soonest opening, the one with the most free time around it, and the next opening.

## Files

```
index.html     app shell
styles.css     styles
app.js         all app logic (state, scheduling, views, sheets)
sw.js          service worker for offline use
manifest.json  home-screen app settings
icons/         app icons
design/        design mockup source
```

## Data model

```
RoutineBlock { id, name, category, days[0-6], start, end }      // times = minutes after midnight
Task         { id, title, durationMin, category, date, start|null, mode: auto|fixed|anytime, done, actualMin? }
Chore        { id, title, durationMin, category, repeat, mode, time?, nextDue, slot?, doneDates[], history[] }
TimeEntry    { id, category, date, start, minutes, note, source: manual|task|chore }
```

Use **Routine → Export backup** now and then. Clearing Safari's website data deletes everything.
