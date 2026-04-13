// Persists the user's last-selected event across pages.
// Backed by localStorage; falls back gracefully if unavailable.

const KEY = 'scioapp.selectedEvent'

export function getSavedEventName() {
    try {
        return window.localStorage.getItem(KEY) || null
    } catch (e) {
        return null
    }
}

export function saveEventName(name) {
    try {
        if (name) window.localStorage.setItem(KEY, name)
    } catch (e) { /* ignore */ }
}

// Given an events list, find the saved event object (or null).
export function findSavedEvent(events) {
    const name = getSavedEventName()
    if (!name || !events) return null
    return events.find(e => e.name === name) || null
}
