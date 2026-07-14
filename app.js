const staticMexicoHolidays = { "01-01": "New Year's Day", "05-01": "Labor Day", "09-16": "Independence Day", "12-25": "Christmas" };
// FIXED: Reads your custom holidays from localStorage, falling back to your default list on first load
const myCustomHolidays = JSON.parse(localStorage.getItem('user_custom_holidays')) || {
    "04-02": "Maundy Thursday",
    "04-03": "Good Friday",
    "11-02": "Day of the Dead",
    "12-12": "Virgin of Guadalupe",
    "12-24": "Half Day Christmas Eve",
    "12-31": "Half Day New Year's Eve"
};

const State = {
    currentDate: new Date(),
    view: 'default', // 'default', 'calendar', 'expenses'
    notes: JSON.parse(localStorage.getItem('user_calendar_notes')) || {},
    expenses: JSON.parse(localStorage.getItem('user_calendar_expenses')) || {}
};

const monthsEn = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
const dayLabelsArr = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ];
let targetedDateKey = "", bulkRangeStart = null, bulkRangeEnd = null;


function calculateMexicoHolidays(year) {
    let h = { ...staticMexicoHolidays }; let feb1 = new Date(year, 1, 1); h[ `02-${String(1 + ((8 - feb1.getDay()) % 7)).padStart(2, '0')}` ] = "Constitution Day";
    let mar1 = new Date(year, 2, 1); h[ `03-${String((1 + ((8 - mar1.getDay()) % 7)) + 14).padStart(2, '0')}` ] = "Benito Juarez Birthday";
    let nov1 = new Date(year, 10, 1); h[ `11-${String((1 + ((8 - nov1.getDay()) % 7)) + 14).padStart(2, '0')}` ] = "Revolution Day"; return h;
}

function switchView(viewName) {
    State.view = viewName; document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active")); event.target.classList.add("active");
    document.getElementById("month-total-expenses").setAttribute("data-visible", (viewName === "expenses") ? "true" : "false");
    document.getElementById("month-free-days").setAttribute("data-visible", (viewName === "calendar") ? "true" : "false");
    buildCalendar();
}


function applyCellColorsAndTexts(cell, textLabel, year, month, day, yearHolidays) {
    const padM = String(month + 1).padStart(2, '0'), padD = String(day).padStart(2, '0'), fullKey = `${year}-${padM}-${padD}`, shortKey = `${padM}-${padD}`;
    let hasOfficial = !!yearHolidays[ shortKey ], hasCustom = !!myCustomHolidays[ shortKey ], hasPersonal = State.notes[ fullKey ] && State.notes[ fullKey ].length > 0, dayExpensesList = State.expenses[ fullKey ] || [];
    let isHalfDay = hasCustom && myCustomHolidays[ shortKey ].toLowerCase().includes("half");

    if (State.view !== "expenses") {
        if (hasOfficial) textLabel.innerText = yearHolidays[ shortKey ]; else if (hasCustom) textLabel.innerText = myCustomHolidays[ shortKey ];
        if (hasPersonal) { const total = State.notes[ fullKey ].length; textLabel.innerText = State.notes[ fullKey ] + (total > 1 ? ` (+${total - 1})` : ''); }
        if (hasPersonal) cell.setAttribute("data-type", hasOfficial ? "mixed" : (hasCustom ? "mixed" : "personal"));
        else if (hasOfficial && hasCustom) cell.setAttribute("data-type", "triple-mixed"); else if (hasOfficial) cell.setAttribute("data-type", "holiday"); else if (hasCustom) { cell.setAttribute("data-type", "custom-holiday"); if (isHalfDay) cell.setAttribute("data-half-day", "true"); }
    }
    if (dayExpensesList.length > 0 && State.view !== "calendar") {
        const sum = dayExpensesList.reduce((a, c) => a + Number(c.amount), 0); const b = document.createElement("div"); b.className = "cell-expense-badge"; b.innerText = `$${sum}`; cell.appendChild(b);
        if (State.view === "expenses") { textLabel.innerText = dayExpensesList[ 0 ].concept + (dayExpensesList.length > 1 ? ` (+${dayExpensesList.length - 1})` : ''); textLabel.style.color = "#15803d"; }
    }
    return { fullKey, hasOfficial, hasCustom, hasPersonal, dayExpensesList, shortKey };
}


function buildCalendar() {
    const grid = document.getElementById("calendar-grid-container"); const displayTitle = document.getElementById("month-name-display"); grid.innerHTML = '';
    const currentYear = State.currentDate.getFullYear(), currentMonth = State.currentDate.getMonth(), yearHolidays = calculateMexicoHolidays(currentYear); displayTitle.innerText = `${monthsEn[ currentMonth ]} ${currentYear}`;
    // Responsive Header labels optimizer loop
    const isMobileViewport = window.innerWidth <= 600;
    dayLabelsArr.forEach(l => {
        const h = document.createElement("div");
        h.className = "weekday-label";
        // Displays single character (S, M, T) on phones, full label (Sun, Mon) on Desktop
        h.innerText = isMobileViewport ? l.charAt(0) : l;
        grid.appendChild(h);
    });

    const firstWeekdayIndex = new Date(currentYear, currentMonth, 1).getDay(), totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate(), totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    let monthlyTotalSum = 0, monthlyFreeDaysCount = 0;

    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    for (let i = firstWeekdayIndex - 1; i >= 0; i--) {
        const cell = document.createElement("div"); cell.className = "day-cell"; cell.setAttribute("data-adjacent", "true"); const targetDay = totalDaysInPrevMonth - i;
        const num = document.createElement('div'); num.className = "day-number"; num.innerText = targetDay; cell.appendChild(num); const tl = document.createElement('div'); tl.className = "cell-note";
        applyCellColorsAndTexts(cell, tl, prevMonthDate.getFullYear(), prevMonthDate.getMonth(), targetDay, yearHolidays); cell.appendChild(tl); grid.appendChild(cell);
    }
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
        const cell = document.createElement("div"); cell.className = "day-cell";
        const num = document.createElement("div"); num.className = "day-number"; num.innerText = dayNum; cell.appendChild(num); const tl = document.createElement("div"); tl.className = "cell-note"; cell.appendChild(tl);
        const { fullKey, hasOfficial, hasCustom, hasPersonal, dayExpensesList, shortKey } = applyCellColorsAndTexts(cell, tl, currentYear, currentMonth, dayNum, yearHolidays);
        dayExpensesList.forEach(e => monthlyTotalSum += Number(e.amount));

        // EXCLUSION ENGINE: Completely skips half-days from the free days counter
        let checkDayOfWeek = new Date(currentYear, currentMonth, dayNum).getDay();
        let isWeekend = (checkDayOfWeek === 0 || checkDayOfWeek === 6);
        let isCorporateHalfDay = !!myCustomHolidays[ shortKey ] && myCustomHolidays[ shortKey ].toLowerCase().includes("half");

        if (hasOfficial) {
            // Statutory federal days always count as 1 full free day
            monthlyFreeDaysCount += 1;
        } else if (!!myCustomHolidays[ shortKey ]) {
            // ONLY add to the counter if it's a FULL corporate holiday (no "half" in the text)
            if (!isCorporateHalfDay) {
                monthlyFreeDaysCount += 1;
            }
        } else if (hasPersonal && !isWeekend) {
            // Requested personal vacations only count on weekdays
            monthlyFreeDaysCount += 1;
        }



        cell.addEventListener('click', () => {
            targetedDateKey = fullKey; document.getElementById("modal-date-title").innerText = `${dayNum} ${monthsEn[ currentMonth ]}`;
            const listContainer = document.getElementById("modal-general-list"); document.getElementById("form-general-summary").classList.remove("hidden-panel");
            if (State.view === "default") {
                document.getElementById("form-general-summary").style.display = "block"; document.getElementById("form-agenda").style.display = "none"; document.getElementById("form-expenses").style.display = "none";
                document.getElementById("form-general-summary").insertBefore(listContainer, document.getElementById("form-general-summary").firstChild);
            } else if (State.view === "expenses") {
                document.getElementById("form-general-summary").style.display = "none"; document.getElementById("form-agenda").style.display = "none"; document.getElementById("form-expenses").style.display = "block";
                document.getElementById("form-expenses").insertBefore(listContainer, document.getElementById("form-expenses").firstChild);
            } else {
                document.getElementById("form-general-summary").style.display = "none"; document.getElementById("form-agenda").style.display = "block"; document.getElementById("form-expenses").style.display = "none";
                document.getElementById("form-agenda").insertBefore(listContainer, document.getElementById("note-input"));
            }
            renderModalNotesList(); document.getElementById("note-modal").setAttribute("data-active", "true");
        });
        grid.appendChild(cell);
    }
    const nextMonthDate = new Date(currentYear, currentMonth + 1, 1); const remainingEmptyCells = (7 - ((firstWeekdayIndex + totalDaysInMonth) % 7)) % 7;
    for (let nextDay = 1; nextDay <= remainingEmptyCells; nextDay++) {
        const cell = document.createElement('div'); cell.className = "day-cell"; cell.setAttribute("data-adjacent", "true"); const num = document.createElement('div'); num.className = "day-number"; num.innerText = nextDay; cell.appendChild(num);
        const tl = document.createElement('div'); tl.className = "cell-note"; applyCellColorsAndTexts(cell, tl, nextMonthDate.getFullYear(), nextMonthDate.getMonth(), nextDay, yearHolidays); cell.appendChild(tl); grid.appendChild(cell);
    }
    document.getElementById("month-total-expenses").innerText = `Month Total: $${monthlyTotalSum.toFixed(2)}`; document.getElementById("month-free-days").innerText = `Free Days: ${monthlyFreeDaysCount}`;
}


window.openSubForm = function (type) {
    document.getElementById("form-general-summary").classList.add("hidden-panel");
    const listContainer = document.getElementById("modal-general-list");

    if (type === "agenda") {
        document.getElementById("modal-date-title").innerText = "New Requested Day";
        document.getElementById("form-agenda").style.display = "block";
        document.getElementById("form-expenses").style.display = "none";
        document.getElementById("form-agenda").insertBefore(listContainer, document.getElementById("note-input"));

        // FOCUS FIX: Instantly activates the text field and pops up the mobile keyboard
        setTimeout(() => { document.getElementById("note-input").focus(); }, 50);

    } else {
        document.getElementById("modal-date-title").innerText = "New Expense Item";
        document.getElementById("form-agenda").style.display = "none";
        document.getElementById("form-expenses").style.display = "block";
        document.getElementById("form-expenses").insertBefore(listContainer, document.getElementById("form-expenses").firstChild);

        // FOCUS FIX: Instantly activates the financial concept field on panel load
        setTimeout(() => { document.getElementById("expense-concept").focus(); }, 50);
    }
    renderModalNotesList();
};


function renderModalNotesList() {
    const container = document.getElementById("modal-general-list"); container.innerHTML = '';
    const currentYear = State.currentDate.getFullYear(), yearHolidays = calculateMexicoHolidays(currentYear), shortKey = targetedDateKey.split('-').slice(1).join('-');
    if (State.view !== "expenses") {
        if (yearHolidays[ shortKey ]) { const item = document.createElement('div'); item.className = 'modal-note-item'; item.style.background = 'var(--color-holiday)'; item.style.color = 'var(--text-holiday)'; item.style.borderColor = '#c7d2fe'; item.innerHTML = `<span>🎉 Official Holiday: ${yearHolidays[ shortKey ]}</span>`; container.appendChild(item); }
        if (myCustomHolidays[ shortKey ]) { const item = document.createElement('div'); item.className = 'modal-note-item'; item.style.background = 'var(--color-custom-holiday)'; item.style.color = 'var(--text-custom)'; item.style.borderColor = '#bbf7d0'; item.innerHTML = `<span>💼 Private Holiday: ${myCustomHolidays[ shortKey ]}</span>`; container.appendChild(item); }
        const notes = State.notes[ targetedDateKey ] || []; notes.forEach((t, i) => { const item = document.createElement('div'); item.className = 'modal-note-item'; item.style.background = 'var(--color-personal)'; item.style.color = 'var(--text-personal)'; item.style.borderColor = '#fbcfe8'; item.innerHTML = `<span>✈️ Requested Day: ${t}</span><button class="btn-delete-single" onclick="deleteSingleItem(${i}, 'agenda')">×</button>`; container.appendChild(item); });
    }
    if (State.view !== "calendar") {
        const expenses = State.expenses[ targetedDateKey ] || []; expenses.forEach((e, i) => { const item = document.createElement('div'); item.className = 'modal-note-item'; item.style.background = '#f0fdf4'; item.style.color = '#15803d'; item.style.borderColor = '#bbf7d0'; item.innerHTML = `<span>💰 Expense - ${e.concept}: <b>$${e.amount}</b></span><button class="btn-delete-single" onclick="deleteSingleItem(${i}, 'expense')">×</button>`; container.appendChild(item); });
    }
    if (container.children.length === 0) { container.innerHTML = `<p style="text-align:center; font-size:0.85rem; color:var(--text-muted); padding:10px 0;">No entries scheduled for this day yet. ✨</p>`; }
}


window.deleteSingleItem = function (index, type) {
    if (type === "agenda") { State.notes[ targetedDateKey ].splice(index, 1); if (State.notes[ targetedDateKey ].length === 0) delete State.notes[ targetedDateKey ]; localStorage.setItem("user_calendar_notes", JSON.stringify(State.notes)); }
    else { State.expenses[ targetedDateKey ].splice(index, 1); if (State.expenses[ targetedDateKey ].length === 0) delete State.expenses[ targetedDateKey ]; localStorage.setItem("user_calendar_expenses", JSON.stringify(State.expenses)); }
    const itemsLeft = (type === "agenda") ? (State.notes[ targetedDateKey ] || []).length : (State.expenses[ targetedDateKey ] || []).length;
    if (itemsLeft === 0) document.getElementById("note-modal").setAttribute("data-active", "false"); else renderModalNotesList();
    buildCalendar();
};

document.getElementById("btn-choose-agenda").addEventListener('click', () => openSubForm('agenda'));
document.getElementById("btn-choose-expense").addEventListener('click', () => openSubForm('expense'));
document.getElementById("btn-save-note").addEventListener('click', () => { const t = document.getElementById("note-input").value.trim(); if (t) { if (!State.notes[ targetedDateKey ]) State.notes[ targetedDateKey ] = []; State.notes[ targetedDateKey ].push(t); localStorage.setItem("user_calendar_notes", JSON.stringify(State.notes)); document.getElementById("note-input").value = ""; document.getElementById("note-modal").setAttribute("data-active", "false"); buildCalendar(); } });
document.getElementById("btn-save-expense").addEventListener('click', () => { const c = document.getElementById("expense-concept").value.trim(), a = document.getElementById("expense-amount").value.trim(); if (c && a) { if (!State.expenses[ targetedDateKey ]) State.expenses[ targetedDateKey ] = []; State.expenses[ targetedDateKey ].push({ concept: c, amount: Number(a) }); localStorage.setItem("user_calendar_expenses", JSON.stringify(State.expenses)); document.getElementById("expense-concept").value = ""; document.getElementById("expense-amount").value = ""; document.getElementById("note-modal").setAttribute("data-active", "false"); buildCalendar(); } });

document.getElementById("btn-open-bulk").addEventListener('click', () => { bulkRangeStart = null; bulkRangeEnd = null; const picker = document.getElementById("bulk-start-date"); picker.value = new Date().toISOString().split('T')[ 0 ]; picker.setAttribute("data-waiting-end", "false"); document.getElementById("bulk-instruction-text").innerHTML = "Select your <b>Start Date</b> using the box below."; document.getElementById("bulk-modal").setAttribute("data-active", "true"); });
document.getElementById("btn-close-bulk").addEventListener('click', () => document.getElementById("bulk-modal").setAttribute("data-active", "false"));
document.getElementById("btn-close-modal").addEventListener('click', () => closeModal());

window.closeModal = function () { document.getElementById("note-modal").setAttribute("data-active", "false"); };

window.resetModalWorkflow = function () {
    if (State.view !== "default") {
        closeModal();
        return;
    }

    // EXPLICIT FIX: Splices the global key string and extracts the day integer accurately
    const dateSegments = targetedDateKey.split('-'); // e.g. ["2026", "07", "13"]
    const dayValue = parseInt(dateSegments[ 2 ], 10); // Safely grabs the third segment (13)
    const currentMonthIndex = State.currentDate.getMonth();

    // Updates the window title correctly using the English months catalog array
    document.getElementById("modal-date-title").innerText = `${dayValue} ${monthsEn[ currentMonthIndex ]}`;

    document.getElementById("form-general-summary").classList.remove("hidden-panel");
    document.getElementById("form-general-summary").style.display = "block";
    document.getElementById("form-agenda").style.display = "none";
    document.getElementById("form-expenses").style.display = "none";

    const listContainer = document.getElementById("modal-general-list");
    document.getElementById("form-general-summary").insertBefore(listContainer, document.getElementById("form-general-summary").firstChild);

    renderModalNotesList();
};


document.getElementById("bulk-start-date").addEventListener('change', (e) => {
    const v = e.target.value; if (!v) return;
    const lbl = document.getElementById("bulk-instruction-text");

    if (!bulkRangeStart) {
        // Step 1: Lock down your start date coordinate parameters
        bulkRangeStart = v;
        e.target.setAttribute("data-waiting-end", "true");
        lbl.innerHTML = "🎯 Start Date locked! Select your <b>End Date</b> now.";

        // INTERACTIVE AUTO-OPEN ENGINE: Forces the native calendar box open instantly
        setTimeout(() => {
            if (typeof e.target.showPicker === 'function') {
                e.target.showPicker(); // Modern native browser auto-trigger method
            } else {
                e.target.click(); // Retro backup dispatch fallback method
            }
        }, 150); // Tiny comfort delay to let the first slide drawer shut cleanly first

    } else if (!bulkRangeEnd) {
        // Step 2: Lock down the terminal coordinate range parameters
        bulkRangeEnd = v;
        e.target.setAttribute("data-waiting-end", "false");
        lbl.innerHTML = `✅ Range ready: From <b>${bulkRangeStart}</b> to <b>${bulkRangeEnd}</b>!`;
        e.target.value = bulkRangeStart; // Locks input layout visual string value securely
    } else {
        // Step 3: Loop reset trigger if you tap onto the field box a third time
        bulkRangeStart = v;
        bulkRangeEnd = null;
        e.target.setAttribute("data-waiting-end", "true");
        lbl.innerHTML = "🎯 Range restarted! Select your <b>End Date</b> now.";

        setTimeout(() => {
            if (typeof e.target.showPicker === 'function') e.target.showPicker();
            else e.target.click();
        }, 150);
    }
});

document.getElementById("btn-bulk-range").addEventListener('click', () => {
    if (!bulkRangeStart || !bulkRangeEnd) { alert("Please select both coordinates first."); return; }
    let tracker = new Date(bulkRangeStart + 'T00:00:00'), limit = new Date(bulkRangeEnd + 'T00:00:00'); if (tracker > limit) { alert("Start date must precede end date."); return; }
    while (tracker <= limit) {
        const y = tracker.getFullYear(), m = String(tracker.getMonth() + 1).padStart(2, '0'), d = String(tracker.getDate()).padStart(2, '0'), fullKey = `${y}-${m}-${d}`;
        if (!State.notes[ fullKey ]) State.notes[ fullKey ] = []; if (!State.notes[ fullKey ].includes("Día Libre ✈️")) State.notes[ fullKey ].push("Día Libre ✈️");
        tracker.setDate(tracker.getDate() + 1);
    }
    localStorage.setItem("user_calendar_notes", JSON.stringify(State.notes)); document.getElementById("bulk-modal").setAttribute("data-active", "false"); buildCalendar();
});

document.getElementById("btn-bulk-fridays").addEventListener('click', () => {
    const year = State.currentDate.getFullYear(), month = State.currentDate.getMonth(), totalDays = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= totalDays; d++) {
        const checkDate = new Date(year, month, d);
        if (checkDate.getDay() === 5) {
            myCustomHolidays[ `${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` ] = "Half Day Off";
        }
    }

    // PERSISTENCE FIX: Save your newly flagged Fridays straight to browser storage vaults
    localStorage.setItem("user_custom_holidays", JSON.stringify(myCustomHolidays));

    document.getElementById("bulk-modal").setAttribute("data-active", "false");
    buildCalendar();
});


document.getElementById("view-tabs").addEventListener('click', (e) => { if (e.target.classList.contains("tab-btn")) switchView(e.target.dataset.view); });
document.getElementById("btn-prev-month").addEventListener('click', () => { State.currentDate.setMonth(State.currentDate.getMonth() - 1); buildCalendar(); });
document.getElementById("btn-next-month").addEventListener('click', () => { State.currentDate.setMonth(State.currentDate.getMonth() + 1); buildCalendar(); });

// A. PERSONAL FREE DAYS CLEANER: Wipes out ALL agended free days within the selected span
document.getElementById("btn-wipe-personal").addEventListener('click', () => {
    if (!bulkRangeStart || !bulkRangeEnd) {
        alert("Please lock your range coordinates in the date box above first.");
        return;
    }
    if (!confirm(`Permanently clear ALL scheduled free days and text notes from ${bulkRangeStart} to ${bulkRangeEnd}?`)) {
        return;
    }

    let tracker = new Date(bulkRangeStart + 'T00:00:00');
    let limit = new Date(bulkRangeEnd + 'T00:00:00');

    // Core calendar loop traverses sequentially across your matrix coordinates
    while (tracker <= limit) {
        const y = tracker.getFullYear();
        const m = String(tracker.getMonth() + 1).padStart(2, '0');
        const d = String(tracker.getDate()).padStart(2, '0');
        const fullKey = `${y}-${m}-${d}`;

        // ULTIMATE FIX: Wipes out the entire agenda object array key for this date.
        // This removes individually typed plans, bulk-added text, and multi-notes instantly.
        if (State.notes[ fullKey ]) {
            delete State.notes[ fullKey ];
        }

        tracker.setDate(tracker.getDate() + 1);
    }

    // Synchronize updates immediately back to LocalStorage
    localStorage.setItem("user_calendar_notes", JSON.stringify(State.notes));

    // Close the bulk modal layout overlay and redraw the grid deck
    document.getElementById("bulk-modal").setAttribute("data-active", "false");
    buildCalendar();
});


// B. CORPORATE HALF DAYS CLEANER: Wipes company holidays only (Verde Menta / Mint cards)
document.getElementById("btn-wipe-corporate").addEventListener('click', () => {
    if (!bulkRangeStart || !bulkRangeEnd) { alert("Please lock your range coordinates in the date box above first."); return; }
    if (!confirm(`Permanently clear company HALF DAYS from ${bulkRangeStart} to ${bulkRangeEnd}?`)) return;

    let tracker = new Date(bulkRangeStart + 'T00:00:00'), limit = new Date(bulkRangeEnd + 'T00:00:00');
    while (tracker <= limit) {
        const m = String(tracker.getMonth() + 1).padStart(2, '0'), d = String(tracker.getDate()).padStart(2, '0'), shortKey = `${m}-${d}`;
        if (myCustomHolidays[ shortKey ]) delete myCustomHolidays[ shortKey ];
        tracker.setDate(tracker.getDate() + 1);
    }

    // PERSISTENCE FIX: Sincroniza la eliminación masiva con la memoria local
    localStorage.setItem("user_custom_holidays", JSON.stringify(myCustomHolidays));

    document.getElementById("bulk-modal").setAttribute("data-active", "false"); buildCalendar();
});


// INTERCEPTOR CORE: Routes Enter key triggers straight to Save buttons based on active sub-form
document.getElementById("note-input").addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Blocks native page reloads
        document.getElementById("btn-save-note").click(); // Triggers Save Free Day click function
    }
});

document.getElementById("expense-concept").addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        document.getElementById("expense-amount").focus(); // Smart Focus Shift: Moves cursor to amount field first
    }
});

document.getElementById("expense-amount").addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        document.getElementById("btn-save-expense").click(); // Triggers Log Expense click function
    }
});



// MOBILE INTERACTION ENGINE: Moves month arrows to the footer row if on mobile screens
if (window.innerWidth <= 600) {
    const navArrows = document.querySelector(".nav-buttons");
    const footerContainer = document.querySelector(".calendar-footer");
    // Appends the arrow wrapper to the footer container dynamically on startup
    if (navArrows && footerContainer) {
        footerContainer.appendChild(navArrows);
    }
}

// MOBILE NAVIGATION INTERCEPTORS: Wires the new footer circles to the master state engine
document.getElementById("mobile-btn-prev").addEventListener('click', () => {
    State.currentDate.setMonth(State.currentDate.getMonth() - 1);
    buildCalendar();
});

document.getElementById("mobile-btn-next").addEventListener('click', () => {
    State.currentDate.setMonth(State.currentDate.getMonth() + 1);
    buildCalendar();
});

// Also make sure you delete that experimental "window.innerWidth" swap loop we pasted in the previous message!


buildCalendar(); 
