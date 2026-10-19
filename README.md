# TaskPlanner

An iPhone task planner. You set up your usual week once, then add tasks, and the app fits them around your routine.

Design mockups: https://claude.ai/artifact/AQBSJFthum7T4L2X14unnw (the `design/` folder has the source for each screen)

## Screens

| Tab | What it does |
|---|---|
| **Today** | Timeline of the day with routine blocks and tasks, plus an "Anytime today" checklist. Free gaps show as "tap to fill." |
| **Week** | 7-day grid. Work, routine and tasks shown in different colors. |
| **Chores** | Things that repeat on their own (weekly, every N days, specific weekdays). Grouped as Overdue / This week / Later. |
| **Time** | Where your hours went by category (work, driving, gym, chores, errands), compared with the last period. |
| **Routine** | Your weekly schedule: work hours, gym, sleep, and the hours tasks are allowed in. |

## Adding a task

1. Type the task (e.g. "Groceries") and pick a duration.
2. Choose how it gets scheduled:
   - **Find a time for me**: the app suggests open slots that fit.
   - **I'll pick a time**: choose day and start time; warns about overlaps.
   - **Just add to a day**: no set time, goes on that day's Anytime list.

## Chores

- Repeat rules: every N days/weeks/months, or specific weekdays.
- Each chore is **Auto** (app places it), **Fixed** (always the same time) or **Anytime**.
- Checking one off schedules the next one from the completion date.
- Missed chores move to **Overdue** with a "Find time" button.

## Time tracking

Time is collected three ways:
1. Routine blocks (work, gym) count automatically.
2. Finishing a task asks how long it actually took.
3. A start/stop timer for anything else (e.g. driving).

The app compares planned vs. actual and suggests better durations ("Groceries took 1h 05m on average; plan 1h next time?").

## Data model (draft)

```
RoutineBlock { id, name, category, days[], start, end }
Task         { id, title, durationMin, mode: auto|fixed|anytime, date?, start?, done, actualMin? }
Chore        { id, title, durationMin, repeat: {every, unit} | {weekdays[]}, mode, lastDone, nextDue }
TimeEntry    { id, category, start, end, source: routine|task|timer }
Settings     { schedulingWindow: {start, end}, gapMin }
```

## Scheduling ("Find a time")

1. Build the free slots for the next 7 days: the scheduling window minus routine blocks and placed tasks, with the gap padding.
2. Keep slots at least as long as the task.
3. Rank them: soonest first, then longest gap; offer the top 3.

## Status

Design stage. Next step: build it as a PWA (HTML/JS, local storage, service worker), same as the other iPhone apps.
