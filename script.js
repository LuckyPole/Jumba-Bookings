
"use strict";

// ========================================
// 1. Find the HTML elements
// ========================================

const serviceSelect = document.getElementById("service");
const serviceCards = document.querySelectorAll(".service-card");
const bookingDate = document.getElementById("bookingDate");
const timeSlots = document.getElementById("timeSlots");
const selectedTime = document.getElementById("selectedTime");
const summaryService = document.getElementById("summaryService");
const summaryPrice = document.getElementById("summaryPrice");
const summaryDate = document.getElementById("summaryDate");
const bookingForm = document.getElementById("bookingForm");
const formStatus = document.getElementById("formStatus");
const confirmation = document.getElementById("confirmation");
const confirmationDetails =
    document.getElementById("confirmationDetails");
const newBookingButton = document.getElementById("newBooking");

// Available appointment times.
// The final slot begins at 4:00 PM.
const availableTimes = [
    "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00"
];

let chosenTime = "";


// ========================================
// 2. Read saved demonstration bookings
// ========================================

function getBookings() {
    try {
        const saved = localStorage.getItem("bookeaseBookings");
        const bookings = saved ? JSON.parse(saved) : [];

        return Array.isArray(bookings) ? bookings : [];
    } catch (error) {
        console.error("Could not read saved bookings:", error);
        return [];
    }
}


// ========================================
// 3. Set today's date as the minimum
// ========================================

function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

bookingDate.min = getLocalDateString(new Date());


// ========================================
// 4. Format date and time for display
// ========================================

function formatDate(dateString) {
    const parts = dateString.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);

    return date.toLocaleDateString("en-KE", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(":").map(Number);
    const suffix = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;

    return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}


// ========================================
// 5. Keep the service cards and dropdown
//    synchronized
// ========================================

function updateService() {
    const selectedOption = serviceSelect.options[
        serviceSelect.selectedIndex
    ];

    const serviceName = selectedOption.value;
    const price = Number(
        selectedOption.textContent.match(/[\d,]+/)?.[0]
            .replace(",", "") || 0
    );

    summaryService.textContent = serviceName;
    summaryPrice.textContent =
        "KSh " + price.toLocaleString("en-KE");

    serviceCards.forEach(function (card) {
        const isSelected = card.dataset.service === serviceName;

        card.classList.toggle("selected", isSelected);
        card.setAttribute("aria-pressed", String(isSelected));
    });
}

serviceCards.forEach(function (card) {
    card.setAttribute(
        "aria-pressed",
        String(card.classList.contains("selected"))
    );

    card.addEventListener("click", function () {
        serviceSelect.value = card.dataset.service;
        updateService();
    });
});

serviceSelect.addEventListener("change", updateService);

updateService();


// ========================================
// 6. Update the appointment date summary
// ========================================

function updateDateSummary() {
    if (!bookingDate.value) {
        summaryDate.textContent = "Choose a date";
        return;
    }

    summaryDate.textContent = formatDate(bookingDate.value);

    if (chosenTime) {
        summaryDate.textContent += " at " + formatTime(chosenTime);
    }
}


// ========================================
// 7. Display available time slots
// ========================================

function renderTimeSlots() {
    timeSlots.replaceChildren();
    chosenTime = "";
    selectedTime.value = "";
    updateDateSummary();

    const date = bookingDate.value;

    if (!date) {
        const message = document.createElement("p");
        message.className = "muted";
        message.textContent = "Choose a date to view available times.";
        timeSlots.appendChild(message);
        return;
    }

    // Parse the selected date in local time.
    const [year, month, day] = date.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const today = getLocalDateString(new Date());

    // Prevent past dates.
    if (date < today) {
        showStatus("Please choose today or a future date.", true);
        return;
    }

    // Sunday is not a working day.
    if (selectedDate.getDay() === 0) {
        showStatus("We are closed on Sundays. Please choose another day.", true);
        return;
    }

    showStatus("", false);

    const bookings = getBookings();

    availableTimes.forEach(function (time) {
        const alreadyBooked = bookings.some(function (booking) {
            return booking.date === date && booking.time === time;
        });

        const button = document.createElement("button");
        button.type = "button";
        button.className = "time-slot";
        button.textContent = formatTime(time);

        if (alreadyBooked) {
            button.disabled = true;
            button.textContent += " — Booked";
            button.setAttribute("aria-label",
                formatTime(time) + " already booked");
        } else {
            button.addEventListener("click", function () {
                chooseTime(time);
            });
        }

        timeSlots.appendChild(button);
    });

    if (availableTimes.every(function (time) {
        return bookings.some(function (booking) {
            return booking.date === date && booking.time === time;
        });
    })) {
        const message = document.createElement("p");
        message.className = "no-slots";
        message.textContent =
            "No slots are available in this browser for that date.";
        timeSlots.appendChild(message);
    }
}


// ========================================
// 8. Select an appointment time
// ========================================

function chooseTime(time) {
    chosenTime = time;
    selectedTime.value = time;

    const buttons = timeSlots.querySelectorAll(".time-slot");

    buttons.forEach(function (button) {
        const isSelected = button.textContent === formatTime(time);

        button.classList.toggle("selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
    });

    updateDateSummary();
    showStatus("", false);
}


// ========================================
// 9. Show form feedback safely
// ========================================

function showStatus(message, isError) {
    formStatus.textContent = message;
    formStatus.style.color = isError ? "#b91c1c" : "#166534";
}


// ========================================
// 10. Submit and validate the booking
// ========================================

bookingForm.addEventListener("submit", function (event) {
    event.preventDefault();

    showStatus("", false);

    if (!bookingForm.reportValidity()) {
        return;
    }

    const name = document.getElementById("customerName")
        .value.trim();

    const email = document.getElementById("customerEmail")
        .value.trim();

    const phone = document.getElementById("customerPhone")
        .value.trim();

    const date = bookingDate.value;
    const notes = document.getElementById("notes").value.trim();

    const [year, month, day] = (date || "").split("-").map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const today = getLocalDateString(new Date());

    if (name.length < 2 || !email || !phone) {
        showStatus("Please provide your name, email and phone number.", true);
        return;
    }

    if (!date || date < today) {
        showStatus("Please select a valid future appointment date.", true);
        return;
    }

    if (selectedDate.getDay() === 0) {
        showStatus("Bookings are not available on Sundays.", true);
        return;
    }

    if (!chosenTime) {
        showStatus("Please select an available appointment time.", true);
        return;
    }

    // Check availability again before saving.
    const bookings = getBookings();

    const duplicate = bookings.some(function (booking) {
        return booking.date === date && booking.time === chosenTime;
    });

    if (duplicate) {
        showStatus(
            "That time has already been booked. Please select another slot.",
            true
        );
        renderTimeSlots();
        return;
    }

    // Create a demonstration booking reference.
    const reference =
        "BK-" + Date.now().toString().slice(-8);

    const booking = {
        reference: reference,
        name: name,
        email: email,
        phone: phone,
        service: serviceSelect.value,
        date: date,
        time: chosenTime,
        notes: notes,
        createdAt: new Date().toISOString()
    };

    // Save to this browser only.
    try {
        bookings.push(booking);

        localStorage.setItem(
            "bookeaseBookings",
            JSON.stringify(bookings)
        );
    } catch (error) {
        console.error("Could not save booking:", error);

        showStatus(
            "The booking could not be saved. Check browser storage settings.",
            true
        );
        return;
    }

    // Show confirmation.
    confirmationDetails.textContent =
        "Reference: " + reference +
        " | Service: " + booking.service +
        " | Date: " + formatDate(booking.date) +
        " | Time: " + formatTime(booking.time) +
        " | Customer: " + booking.name;

    confirmation.hidden = false;
    confirmation.scrollIntoView({ behavior: "smooth" });

    bookingForm.reset();
    bookingDate.min = getLocalDateString(new Date());
    updateService();
    renderTimeSlots();
});


// ========================================
// 11. Handle date changes
// ========================================

bookingDate.addEventListener("change", function () {
    renderTimeSlots();
});


// ========================================
// 12. Start a new booking
// ========================================

newBookingButton.addEventListener("click", function () {
    confirmation.hidden = true;
    chosenTime = "";
    selectedTime.value = "";

    updateService();
    renderTimeSlots();

    document.getElementById("booking").scrollIntoView({
        behavior: "smooth"
    });
});


// ========================================
// 13. Initialize the platform
// ========================================

document.getElementById("currentYear").textContent =
    new Date().getFullYear();

renderTimeSlots();
