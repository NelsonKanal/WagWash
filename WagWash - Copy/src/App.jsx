
import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import "./auth.css";

import {
  PawPrint,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Scissors,
  Dog,
  Clock,
  Search,
  Plus,
  Check,
  Bell,
  CreditCard,
  ArrowRight,
  Menu,
  X,
  Sparkles,
  LogOut,
  Mail,
  LockKeyhole,
  Chrome,
} from "lucide-react";

// ---------------- SERVICES ----------------

const services = [
  {
    name: "Bath & Brush",
    price: 45,
    duration: 45,
    icon: "🫧",
    description: "A fresh wash and brush out",
  },
  {
    name: "Full Groom",
    price: 75,
    duration: 90,
    icon: "✂️",
    description: "Bath, haircut and nail trim",
  },
  {
    name: "Puppy Tidy",
    price: 55,
    duration: 60,
    icon: "🐶",
    description: "A gentle first grooming visit",
  },
  {
    name: "Nail Trim",
    price: 20,
    duration: 15,
    icon: "🐾",
    description: "Quick and careful paw care",
  },
];

const times = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:30 PM",
  "1:30 PM",
  "2:30 PM",
  "3:30 PM",
];

const today = new Date().toISOString().slice(0, 10);

// ---------------- HELPERS ----------------

const money = (amount) =>
  `$${Number(amount || 0).toFixed(2)}`;

function formatDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(
    "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function toDatabaseTime(label) {
  const [clock, meridiem] = label.split(" ");
  let [hours, minutes] = clock.split(":").map(Number);

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  return `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}:00`;
}

function toDisplayTime(value) {
  if (!value) return "";

  const [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${String(minutes).padStart(
    2,
    "0"
  )} ${period}`;
}

function mapBooking(row) {
  // Public visitors are only allowed to read slot occupancy fields.
  // Customer contact details are intentionally not exposed by public RLS.
  return {
    id: row.id,
    customer: row.customer_name || "Reserved appointment",
    phone: row.customer_phone || "",
    email: row.customer_email || "",
    dog: row.dog_name || "Booked slot",
    breed: row.dog_breed || "Not specified",
    notes: row.notes || "",
    service: row.service_name || "Appointment",
    price: Number(row.service_price || 0),
    date: row.booking_date,
    time: toDisplayTime(row.booking_time),
    status: row.status
      ? row.status.charAt(0).toUpperCase() + row.status.slice(1)
      : "Pending",
    payment: row.payment_status === "paid" ? "Paid" : "Pending",
  };
}

// ---------------- LOGO ----------------

function Logo() {
  return (
    <div className="logo">
      <div className="logo-icon">
        <PawPrint size={25} />
      </div>

      <div>
        <strong>wag & wash</strong>
        <small>GOOD DOGS. GREAT GROOMS.</small>
      </div>
    </div>
  );
}

// ---------------- SIDEBAR ----------------

function SidebarContent({ page, navigate, isOwner }) {
  const items = [
    {
      id: "book",
      text: "Book an appointment",
      Icon: CalendarDays,
    },
    {
      id: "mine",
      text: "My bookings",
      Icon: ClipboardList,
    },
    {
      id: "owner",
      text: "Owner dashboard",
      Icon: LayoutDashboard,
    },
  ].filter((item) => item.id !== "owner" || isOwner);

  return (
    <>
      <p className="nav-heading">YOUR SPACE</p>

      <nav className="nav-list">
        {items.map(({ id, text, Icon }) => (
          <button
            key={id}
            className={`nav-item ${
              page === id ? "active" : ""
            }`}
            onClick={() => navigate(id)}
          >
            <Icon size={19} />
            {text}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="help-card">
          <Sparkles size={22} />

          <h3>A little extra care</h3>

          <p>
            Questions about your pup's appointment?
          </p>

          <button
            onClick={() =>
              alert("Add Jess's contact details here.")
            }
          >
            Contact Jess →
          </button>
        </div>

        <div className="owner-profile">
          <div className="avatar">J</div>

          <div>
            <strong>Jess Parker</strong>
            <small>Owner · Wag & Wash</small>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------- HEADER ----------------

function Header({ page, setMenuOpen, user, onSignOut, isOwner }) {
  const titles = {
    book: [
      "Book an appointment",
      "A little pampering goes a long way.",
    ],
    mine: [
      "My bookings",
      "Your pup's next great day is right here.",
    ],
    owner: [
      "Owner dashboard",
      "Your salon, at a glance.",
    ],
  };

  return (
    <header className="topbar">
      <button
        className="mobile-menu icon-button"
        onClick={() => setMenuOpen(true)}
      >
        <Menu />
      </button>

      <div>
        <h1>{titles[page][0]}</h1>
        <p>{titles[page][1]}</p>
      </div>

      <div className="header-right">
        <span className="open-pill">
          <i /> Taking bookings
        </span>

        <span className="signed-in-email" title={user?.email || ""}>
          {isOwner ? "Owner" : user?.email}
        </span>
        <button className="signout-button" onClick={onSignOut} title="Sign out">
          <LogOut size={16} /> <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}

// ---------------- BOOKING PAGE ----------------

function BookingPage({
  bookings,
  onBook,
  navigate,
  user,
}) {
  const [service, setService] = useState("Full Groom");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");

  const [customer, setCustomer] = useState(user?.user_metadata?.full_name || "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email || "");

  const [dog, setDog] = useState("");
  const [breed, setBreed] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  const chosen = services.find(
    (item) => item.name === service
  );

  // Find times already occupied by saved appointments.
  const available = times.filter(
    (slot) =>
      !bookings.some(
        (booking) =>
          booking.date === date &&
          booking.time === slot &&
          booking.status !== "Cancelled"
      )
  );

  // Save appointment to Supabase without requesting private row data back.
  // The database generates no response row because public users cannot read
  // customer records. We create the UUID here for the local confirmation.
  async function saveBookingToSupabase(bookingId) {
    const { error } = await supabase
      .from("bookings")
      .insert({
        id: bookingId,
        user_id: user.id,
        service_name: chosen.name,
        service_price: chosen.price,
        duration_minutes: chosen.duration,
        booking_date: date,
        booking_time: toDatabaseTime(time),
        customer_name: customer.trim(),
        customer_phone: phone.trim(),
        customer_email: email.trim() || user.email || null,
        dog_name: dog.trim(),
        dog_breed: breed.trim() || null,
        notes: notes.trim() || null,
        // Database defaults set deposit_amount=25, status=pending,
        // and payment_status=unpaid. Never let the public form mark payment paid.
      });

    if (error) {
      if (error.code === "23505") {
        throw new Error(
          "This time has just been booked. Please select another time."
        );
      }
      throw error;
    }

    return bookingId;
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!user?.id) {
      setError("Please sign in before booking an appointment.");
      return;
    }

    if (
      !customer.trim() ||
      !phone.trim() ||
      !dog.trim()
    ) {
      setError(
        "Please enter your name, phone number, and dog's name."
      );
      return;
    }

    if (!time || !available.includes(time)) {
      setError(
        "Please choose an available appointment time."
      );
      return;
    }

    if (date < today) {
      setError("Please choose a future date.");
      return;
    }

    setSaving(true);

    try {
      const bookingId = crypto.randomUUID();
      await saveBookingToSupabase(bookingId);

      // Keep the just-created booking visible in this browser session.
      const booking = {
        id: bookingId,
        customer: customer.trim(),
        phone: phone.trim(),
        email: email.trim(),
        dog: dog.trim(),
        breed: breed.trim() || "Not specified",
        notes: notes.trim(),
        service: chosen.name,
        price: chosen.price,
        date,
        time,
        status: "Pending",
        payment: "Pending",
      };

      onBook(booking);

      setConfirmation(booking);
    } catch (err) {
      console.error("Booking error:", err);

      setError(
        err.message ||
          "Unable to save booking. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // ---------------- CONFIRMATION ----------------

  if (confirmation) {
    return (
      <section className="confirmation">
        <div className="success-icon">
          <Check size={32} />
        </div>

        <p className="eyebrow">BOOKING CONFIRMED</p>

        <h2>
          One step closer to a <em>happy pup.</em>
        </h2>

        <p className="muted">
          Your appointment has been saved successfully.
          No payment has been taken.
        </p>

        <div className="summary-card">
          <div className="summary-top">
            <span>APPOINTMENT SUMMARY</span>
            <span className="badge pending">
              Deposit due
            </span>
          </div>

          <div className="summary-dog">
            <div className="dog-icon">
              <Dog />
            </div>

            <div>
              <strong>{confirmation.dog}</strong>
              <p>{confirmation.service}</p>
            </div>
          </div>

          <p>
            {formatDate(confirmation.date)} ·{" "}
            {confirmation.time}
          </p>

          <hr />

          <div className="summary-line">
            <span>Service price</span>
            <strong>{money(confirmation.price)}</strong>
          </div>

          <div className="summary-line">
            <span>Deposit due</span>
            <strong>$25.00</strong>
          </div>

          <p className="demo-warning">
            Payment checkout is not connected yet.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => navigate("mine")}
        >
          View my bookings <ArrowRight size={17} />
        </button>

        <button
          className="text-button"
          onClick={() => {
            setConfirmation(null);
            setCustomer("");
            setPhone("");
            setEmail("");
            setDog("");
            setBreed("");
            setNotes("");
            setTime("");
          }}
        >
          Make another booking
        </button>
      </section>
    );
  }

  // ---------------- BOOKING FORM ----------------

  return (
    <div className="booking-layout">
      <main className="booking-main">
        <div className="intro">
          <p className="eyebrow">
            YOUR PUP'S HAPPY PLACE
          </p>

          <h2>
            Let's get your bestie
            <br />
            looking <em>their best.</em>
          </h2>

          <p>
            Pick a pamper session. We'll take care of the
            rest.
          </p>

          <div className="trust">
            ✓ Gentle, loving care　 ✓ Expert grooming
          </div>
        </div>

        <form onSubmit={submit}>
          {/* SERVICES */}

          <section className="form-section">
            <SectionTitle
              number="01"
              title="Choose their treatment"
              subtitle="Every pup deserves a little self-care."
            />

            <div className="service-grid">
              {services.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  className={`service-card ${
                    service === item.name ? "selected" : ""
                  }`}
                  onClick={() => setService(item.name)}
                >
                  <div className="service-picture">
                    {item.icon}
                  </div>

                  <div className="service-details">
                    <strong>{item.name}</strong>
                    <p>{item.description}</p>

                    <div className="service-meta">
                      <span>
                        <Clock size={13} /> {item.duration} min
                      </span>

                      <b>{money(item.price)}</b>
                    </div>
                  </div>

                  <span className="radio">
                    {service === item.name ? "✓" : ""}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* DATE AND TIME */}

          <section className="form-section">
            <SectionTitle
              number="02"
              title="Find your perfect time"
              subtitle="Choose a day and time that works for you."
            />

            <div className="date-grid">
              {[0, 1, 2, 3].map((offset) => {
                const d = new Date(`${today}T12:00:00`);
                d.setDate(d.getDate() + offset);

                const dateValue = d
                  .toISOString()
                  .slice(0, 10);

                return (
                  <button
                    type="button"
                    key={dateValue}
                    className={`date-option ${
                      date === dateValue ? "selected" : ""
                    }`}
                    onClick={() => {
                      setDate(dateValue);
                      setTime("");
                    }}
                  >
                    <small>
                      {offset === 0
                        ? "TODAY"
                        : d
                            .toLocaleDateString("en-US", {
                              weekday: "short",
                            })
                            .toUpperCase()}
                    </small>

                    <strong>{d.getDate()}</strong>

                    <small>
                      {d.toLocaleDateString("en-US", {
                        month: "short",
                      })}
                    </small>
                  </button>
                );
              })}
            </div>

            <h4 className="time-heading">
              Available times
              <span>Based on saved appointments</span>
            </h4>

            <div className="time-grid">
              {times.map((slot) => {
                const free = available.includes(slot);

                return (
                  <button
                    type="button"
                    key={slot}
                    disabled={!free}
                    className={`time-option ${
                      time === slot ? "selected" : ""
                    }`}
                    onClick={() => setTime(slot)}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>

            {available.length === 0 && (
              <p className="form-error">
                No times available. Please choose another date.
              </p>
            )}
          </section>

          {/* CUSTOMER INFORMATION */}

          <section className="form-section">
            <SectionTitle
              number="03"
              title="Who's coming in?"
              subtitle="Tell us a little about you and your furry friend."
            />

            <div className="input-grid">
              <label>
                Full name *
                <input
                  value={customer}
                  onChange={(e) =>
                    setCustomer(e.target.value)
                  }
                  placeholder="Taylor Morgan"
                  autoComplete="name"
                  required
                />
              </label>

              <label>
                Phone number *
                <input
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  placeholder="Your phone number"
                  autoComplete="tel"
                  required
                />
              </label>

              <label>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>

              <label>
                Dog's name *
                <input
                  value={dog}
                  onChange={(e) => setDog(e.target.value)}
                  placeholder="Biscuit"
                  required
                />
              </label>

              <label>
                Breed
                <input
                  value={breed}
                  onChange={(e) =>
                    setBreed(e.target.value)
                  }
                  placeholder="Cockapoo"
                />
              </label>

              <label className="full-width">
                Grooming notes
                <textarea
                  rows="3"
                  value={notes}
                  onChange={(e) =>
                    setNotes(e.target.value)
                  }
                  placeholder="Sensitive skin, favourite treats, or anything Jess should know..."
                />
              </label>
            </div>

            {error && (
              <p className="form-error">{error}</p>
            )}
          </section>

          {/* DEPOSIT */}

          <div className="deposit-box">
            <div className="deposit-icon">
              <CreditCard />
            </div>

            <div>
              <strong>Secure your spot</strong>
              <p>
                A $25 deposit goes toward your grooming total.
              </p>
            </div>

            <strong className="deposit-amount">
              $25.00
            </strong>
          </div>

          <button
            className="primary-button full-width-button"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving appointment..." : "Book appointment"}
            <ArrowRight size={17} />
          </button>

          <p className="fine-print">
            Your booking will be saved in our database.
            Payment is not collected yet.
          </p>
        </form>
      </main>

      {/* RIGHT SIDE */}

      <aside className="booking-aside">
        <div className="hero-photo">
          <span className="photo-tag">
            <Sparkles size={14} /> THE WAG & WASH WAY
          </span>

          <h3>
            More than a groom.
            <br />
            <em>A tail-wagging good time.</em>
          </h3>
        </div>

        <div className="aside-card">
          <p className="eyebrow">
            YOUR VISIT AT A GLANCE
          </p>

          <div className="aside-service">
            <Scissors size={18} />

            <div>
              <small>TREATMENT</small>
              <strong>{chosen.name}</strong>
              <small>{chosen.duration} minutes</small>
            </div>

            <b>{money(chosen.price)}</b>
          </div>

          <div className="aside-service">
            <CalendarDays size={18} />

            <div>
              <small>APPOINTMENT</small>
              <strong>{formatDate(date)}</strong>
              <small>{time || "Choose a time"}</small>
            </div>
          </div>

          <hr />

          <div className="summary-line">
            <span>Deposit due</span>
            <strong>$25.00</strong>
          </div>

          <p className="muted small">
            The remaining balance is due according to the
            salon's payment policy.
          </p>
        </div>

        <div className="testimonial">
          <div className="stars">★★★★★</div>

          <p>
            “My pup comes home looking wonderful and wagging
            all the way!”
          </p>

          <small>— A happy dog parent</small>
        </div>
      </aside>
    </div>
  );
}

// ---------------- SECTION TITLE ----------------

function SectionTitle({ number, title, subtitle }) {
  return (
    <div className="section-title">
      <span>{number}</span>

      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

// ---------------- MY BOOKINGS ----------------

function MyBookings({ bookings, navigate, loading }) {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = bookings.filter(
    (booking) =>
      (filter === "All" || booking.status === filter) &&
      `${booking.dog} ${booking.customer} ${booking.service} ${booking.id}`
        .toLowerCase()
        .includes(query.toLowerCase())
  );

  return (
    <div className="content-page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">YOUR WAG & WASH VISITS</p>

          <h2>
            My <em>bookings.</em>
          </h2>

          <p>All your pup's pamper days, in one place.</p>
        </div>

        <button
          className="primary-button"
          onClick={() => navigate("book")}
        >
          <Plus size={16} /> Book a visit
        </button>
      </div>

      <div className="banner">
        <PawPrint size={28} />

        <div>
          <strong>
            Every great day starts with a good groom.
          </strong>
          <p>Need to change your visit? Contact Jess for help.</p>
        </div>
      </div>

      <div className="list-toolbar">
        <div className="filter-tabs">
          {[
            "All",
            "Confirmed",
            "Pending",
            "Completed",
            "Cancelled",
          ].map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <label className="search-box">
          <Search size={16} />

          <input
            placeholder="Search bookings"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <div className="booking-list">
        {loading ? (
          <div className="empty-state">
            Loading bookings...
          </div>
        ) : (
          <>
            {filtered.map((booking) => (
              <article
                className="booking-row"
                key={booking.id}
              >
                <div className="booking-date">
                  <strong>
                    {new Date(
                      `${booking.date}T12:00:00`
                    ).getDate()}
                  </strong>

                  <small>
                    {new Date(
                      `${booking.date}T12:00:00`
                    )
                      .toLocaleDateString("en-US", {
                        month: "short",
                      })
                      .toUpperCase()}
                  </small>
                </div>

                <div className="booking-dog">
                  <div className="dog-icon">
                    <Dog size={22} />
                  </div>

                  <div>
                    <strong>{booking.dog}</strong>
                    <small>{booking.breed}</small>
                    <small>
                      {booking.service} · {booking.time}
                    </small>
                  </div>
                </div>

                <div className="booking-ref">
                  <small>BOOKING REF.</small>
                  <strong>{booking.id}</strong>
                </div>

                <div>
                  <span
                    className={`badge ${booking.status.toLowerCase()}`}
                  >
                    {booking.status}
                  </span>

                  <small className="payment-note">
                    {booking.payment === "Paid"
                      ? "Deposit paid"
                      : "Deposit due"}
                  </small>
                </div>

                <button
                  className="small-button"
                  onClick={() =>
                    alert(
                      `Booking ${booking.id}. Contact Jess to make changes.`
                    )
                  }
                >
                  Details
                </button>
              </article>
            ))}

            {filtered.length === 0 && (
              <div className="empty-state">
                No bookings found.
              </div>
            )}
          </>
        )}
      </div>

      <p className="fine-print">
        Appointments are loaded from Supabase.
      </p>
    </div>
  );
}

// ---------------- OWNER DASHBOARD ----------------

function OwnerDashboard({ bookings, loading }) {
  const [period, setPeriod] = useState("Today");
  const [query, setQuery] = useState("");

  const rows = bookings.filter(
    (booking) =>
      (period === "All dates" || booking.date === today) &&
      `${booking.customer} ${booking.dog} ${booking.service}`
        .toLowerCase()
        .includes(query.toLowerCase())
  );

  const paid = bookings.filter(
    (booking) => booking.payment === "Paid"
  ).length * 25;

  const pending = bookings.filter(
    (booking) => booking.payment !== "Paid"
  ).length;

  const countToday = bookings.filter(
    (booking) =>
      booking.date === today &&
      booking.status !== "Cancelled"
  ).length;

  return (
    <div className="content-page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">THE BACK OF HOUSE</p>

          <h2>
            Good morning, <em>Jess.</em>
          </h2>

          <p>Here's what's happening at the salon.</p>
        </div>

        <button
          className="secondary-button"
          onClick={() =>
            alert("Report export can be added later.")
          }
        >
          Export report ↗
        </button>
      </div>

      <div className="owner-banner">
        <div>
          <span className="eyebrow">SALON SNAPSHOT</span>

          <h3>
            Let's make tails <em>wag.</em>
          </h3>

          <p>A little overview of your grooming business.</p>
        </div>

        <div className="banner-dog">🐕</div>
      </div>

      <div className="stats-grid">
        <Stat
          title="Today's appointments"
          value={countToday}
          detail="Scheduled visits"
          icon={<CalendarDays />}
        />

        <Stat
          title="Deposits collected"
          value={money(paid)}
          detail="Confirmed paid deposits"
          icon={<CreditCard />}
        />

        <Stat
          title="Needs attention"
          value={pending}
          detail="Payment pending"
          icon={<Bell />}
        />
      </div>

      <section className="dashboard-card">
        <div className="dashboard-heading">
          <div>
            <h3>Appointment schedule</h3>
            <p>Your pups, all lined up.</p>
          </div>

          <div className="dashboard-controls">
            <label className="search-box">
              <Search size={15} />

              <input
                placeholder="Find a booking"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option>Today</option>
              <option>All dates</option>
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>TIME</th>
                <th>CUSTOMER / DOG</th>
                <th>SERVICE</th>
                <th>DEPOSIT</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((booking) => (
                <tr key={booking.id}>
                  <td>
                    <strong>{booking.time}</strong>
                    <small>{formatDate(booking.date)}</small>
                  </td>

                  <td>
                    <strong>{booking.customer}</strong>
                    <small>
                      {booking.dog} · {booking.breed}
                    </small>
                  </td>

                  <td>{booking.service}</td>

                  <td>
                    <strong>
                      {booking.payment === "Paid"
                        ? "$25.00"
                        : "—"}
                    </strong>

                    <small>{booking.payment}</small>
                  </td>

                  <td>
                    <span
                      className={`badge ${booking.status.toLowerCase()}`}
                    >
                      {booking.status}
                    </span>
                  </td>

                  <td>
                    <button
                      className="small-button"
                      onClick={() =>
                        alert(
                          `Customer: ${booking.customer}\nPhone: ${booking.phone}\nDog: ${booking.dog}\nNotes: ${booking.notes || "None"}`
                        )
                      }
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="empty-state">
              Loading appointments...
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className="empty-state">
              No matching appointments.
            </div>
          )}
        </div>

        <div className="table-footer">
          Showing {rows.length} appointments · Supabase database
        </div>
      </section>

      <div className="owner-bottom">
        <section className="dashboard-card bottom-card">
          <h3>Quick reminders</h3>

          <p className="muted">
            Little things to keep on top of.
          </p>

          <div className="check-row">
            <Check size={16} />

            <div>
              <strong>Appointment SMS reminders</strong>
              <small>
                Connect an SMS provider to enable this.
              </small>
            </div>

            <span className="badge pending">Planned</span>
          </div>

          <div className="check-row">
            <Check size={16} />

            <div>
              <strong>Check tomorrow's schedule</strong>
              <small>Review upcoming grooming visits.</small>
            </div>
          </div>
        </section>

        <section className="dashboard-card bottom-card">
          <h3>Salon hours</h3>

          <p className="muted">Example opening hours.</p>

          <div className="hours-row">
            <span>Mon – Fri</span>
            <strong>9:00 AM – 5:00 PM</strong>
          </div>

          <div className="hours-row">
            <span>Saturday</span>
            <strong>9:00 AM – 3:00 PM</strong>
          </div>

          <div className="hours-row">
            <span>Sunday</span>
            <strong>Closed</strong>
          </div>
        </section>
      </div>
    </div>
  );
}

// ---------------- STAT CARD ----------------

function Stat({ title, value, detail, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{title}</span>
        <span className="stat-icon">{icon}</span>
      </div>

      <strong className="stat-value">{value}</strong>

      <small>{detail}</small>
    </div>
  );
}

// ---------------- AUTHENTICATION ----------------

function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (authError) throw authError;
        if (!data.session) {
          setNotice("Account created. Check your email to confirm your account, then sign in.");
        } else {
          setNotice("Your account has been created.");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
      }
    } catch (err) {
      setError(err.message || "Unable to authenticate. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (authError) throw authError;
    } catch (err) {
      setError(err.message || "Google sign-in could not start.");
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <Logo />
        <p className="eyebrow auth-eyebrow">A HAPPY PLACE FOR EVERY PUP</p>
        <h1>{mode === "signup" ? "Create your account." : "Welcome back."}</h1>
        <p className="auth-description">
          Sign in to book grooming visits and see only your own appointments.
        </p>

        <button className="google-auth-button" type="button" onClick={signInWithGoogle} disabled={busy}>
          <Chrome size={18} /> Continue with Google
        </button>

        <div className="auth-divider"><span>or continue with email</span></div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            Email address
            <span className="auth-input-wrap"><Mail size={17} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></span>
          </label>
          <label>
            Password
            <span className="auth-input-wrap"><LockKeyhole size={17} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} required /></span>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in with email"}
            {!busy && <ArrowRight size={17} />}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "signup" ? "Already have an account?" : "New to Wag & Wash?"}{" "}
          <button type="button" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setNotice(""); }}>
            {mode === "signup" ? "Sign in" : "Create an account"}
          </button>
        </p>
        <p className="auth-privacy">Your bookings are private to your account.</p>
      </section>
    </main>
  );
}

// ---------------- MAIN APP ----------------

export default function App() {
  const [page, setPage] = useState("book");
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [occupiedSlots, setOccupiedSlots] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [databaseError, setDatabaseError] = useState("");

  const isOwner = user?.app_metadata?.role === "owner";

  async function loadOccupiedSlots() {
    const { data, error } = await supabase.rpc("get_booked_slots");
    if (error) {
      console.error("Loading available slots error:", error);
      setDatabaseError("Could not load appointment availability. Please check the Supabase SQL setup.");
      setOccupiedSlots([]);
      return;
    }
    setOccupiedSlots((data || []).map((row) => ({
      date: row.booking_date,
      time: toDisplayTime(row.booking_time),
      status: row.status === "cancelled" ? "Cancelled" : "Pending",
    })));
  }

  async function loadBookings(activeUser) {
    setLoading(true);
    if (!activeUser) {
      setBookings([]);
      setLoading(false);
      return;
    }

    let request = supabase
      .from("bookings")
      .select("*")
      .order("booking_date", { ascending: true })
      .order("booking_time", { ascending: true });

    // Customer RLS only permits their own rows. Owner RLS permits all rows.
    if (activeUser.app_metadata?.role !== "owner") {
      request = request.eq("user_id", activeUser.id);
    }

    const { data, error } = await request;
    if (error) {
      console.error("Loading bookings error:", error);
      setDatabaseError(error.message);
      setBookings([]);
    } else {
      setBookings((data || []).map(mapBooking));
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) console.error("Session error:", error);
      const currentUser = data?.session?.user || null;
      setUser(currentUser);
      setAuthLoading(false);
      await loadOccupiedSlots();
      if (currentUser) await loadBookings(currentUser);
      else {
        setBookings([]);
        setLoading(false);
      }
    }

    initialize();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      setAuthLoading(false);
      setPage("book");
      // Defer Supabase queries to avoid running them inside the auth callback.
      Promise.resolve().then(async () => {
        await loadOccupiedSlots();
        if (currentUser) await loadBookings(currentUser);
        else {
          setBookings([]);
          setLoading(false);
        }
      });
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) setDatabaseError(error.message);
    else {
      setBookings([]);
      setPage("book");
    }
  }

  function createBooking(booking) {
    setBookings((previous) => [booking, ...previous.filter((item) => item.id !== booking.id)]);
    setOccupiedSlots((previous) => [
      { date: booking.date, time: booking.time, status: "Pending" },
      ...previous.filter((item) => !(item.date === booking.date && item.time === booking.time)),
    ]);
  }

  function navigate(next) {
    if (next === "owner" && !isOwner) {
      setPage("book");
      setMenuOpen(false);
      return;
    }
    setPage(next);
    setMenuOpen(false);
  }

  if (authLoading) {
    return <main className="auth-screen"><div className="auth-loading">Loading your Wag & Wash account…</div></main>;
  }

  if (!user) return <AuthScreen />;

  return (
    <div className="app-shell">
      {menuOpen && (
        <button className="mobile-scrim" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
      )}

      <div className={menuOpen ? "sidebar mobile-open" : "sidebar"}>
        <div className="sidebar-mobile-top">
          <Logo />
          <button className="icon-button close-menu" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button>
        </div>
        <SidebarContent page={page} navigate={navigate} isOwner={isOwner} />
      </div>

      <main className="main-area">
        <Header page={page} setMenuOpen={setMenuOpen} user={user} onSignOut={signOut} isOwner={isOwner} />
        <div className="main-content">
          {databaseError && (
            <div className="form-error">
              {databaseError} <button onClick={() => { setDatabaseError(""); loadOccupiedSlots(); loadBookings(user); }}>Try again</button>
            </div>
          )}
          {page === "book" && <BookingPage bookings={occupiedSlots} onBook={createBooking} navigate={navigate} user={user} />}
          {page === "mine" && <MyBookings bookings={bookings} navigate={navigate} loading={loading} />}
          {page === "owner" && isOwner && <OwnerDashboard bookings={bookings} loading={loading} />}
        </div>
        <footer className="footer">
          <span>© 2026 Wag & Wash Grooming Co.</span>
          <span>Made with ♥ for the good dogs.</span>
        </footer>
      </main>
    </div>
  );
}
