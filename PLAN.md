# Wag & Wash Booking App --- Plan

## 1. Project goal

Build a booking app for Wag & Wash, a dog-grooming business run by Jess.
Customers should be able to book a grooming appointment, pay a **\$25
deposit**, and view their bookings. Jess should be able to manage
appointments from an owner dashboard.

**Current phase:** Planning only. Do not implement application code
until this plan is reviewed.

## 2. Users and permissions

-   **Customer:** Create a booking, provide contact and dog details, pay
    the deposit, and view or cancel their own bookings according to the
    cancellation policy.
-   **Owner (Jess):** Sign in to a protected dashboard, view and manage
    all bookings, manage appointment availability, and see
    payment/reminder status.

Customers must never be able to view or change another customer's
private information or bookings.

## 3. Main screens

### A. Booking page

1.  Choose a grooming service and appointment date.
2.  Show only available time slots.
3.  Enter customer name, phone number, and email (email may be optional
    if SMS is the chosen reminder channel).
4.  Add or select a dog, including name, breed, size, and relevant
    grooming notes.
5.  Review the appointment and the \$25 deposit requirement.
6.  Pay the deposit through a payment provider's hosted or tokenized
    checkout.
7.  Show a confirmation only after the server verifies payment and the
    booking is saved.

### B. My Bookings

-   Find bookings using an authenticated customer account or a secure,
    time-limited booking link.
-   Show appointment date/time, service, dog, booking status, and
    deposit status.
-   Provide a cancellation or rescheduling request flow governed by the
    business policy.
-   Do not expose bookings by guessing sequential booking IDs.

### C. Owner Dashboard --- Jess

-   Protected owner sign-in.
-   View upcoming, past, cancelled, and payment-pending bookings.
-   Filter by date, status, customer, or dog.
-   Open a booking to see contact details, dog notes, deposit status,
    and reminder status.
-   Mark appointments as completed or cancelled.
-   Configure business hours, appointment duration/buffers, and
    unavailable dates.
-   Prevent owner-only actions from being accessible to customers.

## 4. Booking and payment flow

1.  Customer chooses a service and slot.
2.  Server checks business hours, duration, blocked periods, and
    existing active bookings.
3.  Server temporarily holds the slot while the customer completes
    checkout, so two customers cannot book the same slot.
4.  Server creates a \$25 deposit checkout session with a payment
    provider.
5.  The payment provider sends a verified webhook after payment
    succeeds.
6.  Server verifies the webhook, records the payment, and confirms the
    booking.
7.  If payment fails or the hold expires, release the slot and mark the
    booking as unpaid/expired.
8.  Make payment and booking operations idempotent so repeated requests
    or webhooks do not create duplicate charges or bookings.

**Important:** Never store raw card numbers or CVVs. Use a payment
provider such as Stripe or another provider supported in the business's
country and currency. Confirm provider availability, currency, and fees
before implementation. The displayed "\$25" is a planning requirement;
confirm whether the business intends USD or an equivalent local
currency.

## 5. Availability rules

-   Store appointment start and end times consistently; display them in
    the business's configured local time zone.
-   A slot is unavailable if it overlaps an active booking or unexpired
    temporary hold.
-   Cancelled and expired bookings should not block availability.
-   Recheck availability on the server immediately before creating a
    hold; do not rely only on what the browser displays.
-   Use a database transaction or equivalent atomic constraint/locking
    strategy to prevent double booking under concurrent requests.
-   Define service durations, working hours, buffers, lead time, and
    cancellation rules before launch.

## 6. Data model

### Customers

-   `id`
-   `name`
-   `phone`
-   `email` (optional if not needed)
-   `created_at`
-   `updated_at`

### Dogs

-   `id`
-   `customer_id` (owner relationship)
-   `name`
-   `breed` (optional)
-   `size` (optional)
-   `notes` (optional; collect only useful grooming/safety information)
-   `created_at`
-   `updated_at`

### Bookings

-   `id`
-   `customer_id`
-   `dog_id`
-   `service_id`
-   `starts_at`
-   `ends_at`
-   `status` (e.g. `pending_payment`, `confirmed`, `cancelled`,
    `completed`, `expired`)
-   `deposit_amount` (2500 minor units for USD 25.00, if USD is
    confirmed)
-   `currency`
-   `payment_status` (e.g. `unpaid`, `pending`, `paid`, `refunded`,
    `failed`)
-   `payment_provider_reference`
-   `hold_expires_at` (nullable)
-   `reminder_status` and `reminder_sent_at`
-   `created_at`
-   `updated_at`

### Supporting records

The three required core entities are customers, dogs, and bookings.
Implementation should also use supporting records for services, business
hours/blocked dates, payment events, and reminder delivery attempts
where appropriate. These support reliable pricing, scheduling, auditing,
and retries without overloading the booking record.

## 7. Text reminders

-   Send an SMS reminder to the customer's verified phone number at a
    configurable interval before the appointment (initial proposal: 24
    hours).
-   Queue the reminder after a booking is confirmed.
-   Track delivery attempts and provider message IDs; retry temporary
    failures safely.
-   Avoid duplicate reminders by using an idempotency key and a reminder
    status.
-   If an appointment is cancelled or rescheduled, cancel or update the
    pending reminder.
-   Choose an SMS provider that supports the business's country and
    sender requirements; confirm cost and delivery rules before launch.
-   Keep reminder messages minimal and avoid including unnecessary
    sensitive details.

## 8. Suggested architecture

-   **Frontend:** Responsive web app with the three main screens.
-   **Backend API:** Validates users, services, availability, booking
    changes, payment callbacks, and reminder jobs.
-   **Database:** Relational database (for example PostgreSQL) for
    customers, dogs, bookings, services, payment events, and scheduling
    constraints.
-   **Payment integration:** Hosted checkout from a supported provider.
-   **SMS integration:** SMS provider plus a background job/queue for
    scheduled reminders.
-   **Authentication:** Customer access appropriate to the chosen UX;
    separate protected owner authentication for Jess.
-   **Deployment:** HTTPS, environment-based secrets, database backups,
    error monitoring, and a staging environment.

The exact framework and hosting provider can be selected after
confirming project constraints.

## 9. Security, privacy, and reliability

-   Validate all input on the server.
-   Enforce owner/customer authorization on every protected endpoint.
-   Store secrets in environment configuration, never in source control.
-   Verify payment webhook signatures.
-   Use HTTPS and rate-limit login, booking, and verification endpoints.
-   Avoid logging full payment details or unnecessary personal data.
-   Provide a privacy notice and clear cancellation/deposit policy.
-   Back up the database and record important payment/booking state
    changes.
-   Use accessible forms, clear validation errors, and mobile-friendly
    layouts.

## 10. Acceptance criteria

-   A customer can select a genuinely available slot and submit valid
    customer/dog details.
-   The server prevents overlapping confirmed bookings and competing
    active holds.
-   A booking is not marked confirmed until payment is verified.
-   The deposit amount and currency are clear before checkout.
-   A successful payment is recorded once, even if the provider retries
    its webhook.
-   Customers can see only their own bookings.
-   Jess can securely view and manage all bookings.
-   A confirmed booking schedules one SMS reminder, and delivery status
    is tracked.
-   Cancellation or rescheduling updates availability and reminders
    consistently.
-   The app works on mobile and desktop and communicates errors clearly.

## 11. Build sequence

1.  Confirm business rules and providers.
2.  Set up project structure, configuration, and database schema.
3.  Implement authentication and owner authorization.
4.  Implement services, working hours, slot availability, and atomic
    booking holds.
5.  Implement customer booking and My Bookings screens.
6.  Integrate deposit checkout and verified payment webhooks.
7.  Implement Jess's owner dashboard.
8.  Add scheduled SMS reminders and retry handling.
9.  Test conflicts, failed payments, webhook retries, cancellations,
    permissions, and mobile layouts.
10. Deploy to staging, verify end-to-end flows, then launch.

## 12. Decisions to confirm before implementation

-   Is the \$25 deposit in USD, or should it be a local-currency amount?
-   Which country/currency will payments be processed in, and which
    payment provider is available?
-   Which SMS provider and sender identity should be used?
-   What are the services, prices, durations, working hours, and time
    zone?
-   What is the cancellation/rescheduling and deposit refund policy?
-   Should customers create accounts, or use secure booking links?
-   Should Jess be the only owner/admin user?
