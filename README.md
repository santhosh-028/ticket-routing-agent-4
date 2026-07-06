# Smart Ticket Routing System

A web-based **Smart Ticket Routing System** developed using **Node.js**, **Express.js**, **HTML**, **CSS**, and **JavaScript**. The application automatically classifies support tickets, assigns priorities, and routes them to the appropriate support team through a simple dashboard.

---

## Features

- 🔐 User Login & Signup
- 🎫 Create Support Tickets
- 🤖 Automatic Ticket Routing
- ⚡ Priority Detection (High / Medium / Low)
- 📊 Dashboard with Team Statistics
- 🔄 Update Ticket Status
- 🗑️ Delete Tickets
- 📈 Live Ticket Queue

---

## Technologies Used

- Node.js
- Express.js
- HTML5
- CSS3
- JavaScript
- Express Session
- bcryptjs

---

## Project Structure

```
ticket-routing-agent/
│
├── server.js
├── package.json
├── package-lock.json
├── README.md
│
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

---

## Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/ticket-routing-agent.git
```

Go to the project folder:

```bash
cd ticket-routing-agent
```

Install dependencies:

```bash
npm install
```

Run the project:

```bash
npm start
```

Open your browser:

```
http://localhost:3000
```

---

## Login Credentials

### Demo Account

**Username**

```
admin
```

**Password**

```
admin123
```

You can also create a new account using the **Sign Up** option.

---

## Project Workflow

1. User logs in.
2. User creates a support ticket.
3. The system analyzes the ticket.
4. Ticket is automatically assigned to the correct team.
5. Priority is generated.
6. Dashboard displays live ticket status.

---

## API Endpoints

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | /api/auth/signup | Register User |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current User |
| GET | /api/tickets | Get Tickets |
| POST | /api/tickets | Create Ticket |
| PATCH | /api/tickets/:id | Update Ticket |
| DELETE | /api/tickets/:id | Delete Ticket |
| GET | /api/stats | Dashboard Statistics |

---

## Future Enhancements

- AI-based Ticket Classification
- Email Notifications
- Database Integration (MongoDB/MySQL)
- Admin Dashboard
- Search & Filter
- Dark Mode
- Analytics Charts

---

## Developer

**Santhosh**

GitHub:
https://github.com/YOUR_GITHUB_USERNAME

---

## License

This project is developed for learning and portfolio purposes.

© 2026 Santhosh. All Rights Reserved.
