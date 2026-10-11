# Final Project

**Academic Term:** Term 1, 2026<br>
**Project:** Course Registration System<br>
**Course:** ITE220 - Web Development II (Section - 2)<br>
**Lecturer:** Zakariyya Bature<br>
**GitHub:** https://github.com/thIhtOO31/CourseRegistrationSystem-ITE220-Final-Project

### Group Members

| Name | Student ID | Role |
| --- | --- | --- |
| Thi Htoo Naing | 2407160007 | Leader |
| Wai Yan Moe Aung | 2405270011 | Backend |
| Thet Min Khant | 2405210015 | Database |
| Aung Kaung Myat | 2310030015 | Frontend |

### Course Registration System

Wakanda University - Course Registration System is a clean, responsive MERN application with separate Admin, Advisor, and Student pages. It preserves the project's original registration rules, authorization, and five MongoDB collections: **users, courses, offerings, registrations, records**.

**Features**

| Role | Pages |
| --- | --- |
| Admin | Overview, Manage Users, Add User, Manage Courses |
| Advisor | Overview, Course Offerings, Students, Student Details, Student Registration |
| Student | Overview, My Courses & Timetable, Academic History, Add/Drop Request |

**Requirements**

- Node.js 18+ with npm
- MongoDB Atlas replica set (recommended because registration write operations use MongoDB transactions)

**Installation and development**

From the project root:

```bash
cd server
npm install

cd client
npm install client
```

Create `server/.env`. Fill in your own `MONGO_URI`, `JWT_SECRET`, `PORT` and `CLIENT_URL` values. **Never commit or share your `.env`.**

```env
MONGO_URI=mongodb+srv://<Username>:<Password>.s1ww01y.mongodb.net/?appName=M0
JWT_SECRET=<Random Password>
PORT=3000
CLIENT_URL=http://localhost:5173
```

**Seed only a NEW/EMPTY development database:**

```bash
npm run seed server
```

The seed refuses to run if any of the five project collections contains data, or if the local credentials file already exists. It does not delete records or automatically reset anything. It creates 1 admin, 4 advisors and 25 named students, their history, current registrations and 12 course sections. Fixed academic edge cases (retakes, full seats, time clashes) remain available.

### Development login credentials

After **successful seeding**, open the local file:

`server/.seed-credentials.csv`

It contains each seeded account's **role, name, unique email, student ID and unique randomly generated initial password**. It is created with restricted filesystem permissions where supported, never returned by the API, never embedded in the frontend and excluded by `.gitignore`. Each account's password is bcrypt-hashed in MongoDB. Do not publish, email publicly, or commit the CSV; safeguard it as a development secret. If you lose the file, reset passwords using a controlled process; do not rerun the seed on a populated database.

Wakanda University - Course Registration System and its email domain are fictional. The seed creates an account named **Admin** (`admin@admin.wakanda.forever`), four advisors with addresses such as `satoru.gojo@advisor.wakanda.forever`, and 25 students with addresses such as `st2026001@student.wakanda.forever`. Names are anime characters used for sample data only. Course codes and names are illustrative, not official university curriculum information.

In separate terminals:

```bash
npm run dev
npm run dev
```

Open `http://localhost:5173` in a browser.

### File structure

```text
client/
    public/
        add-drop-form.docx
        wu-logo.png
        wu-logo.svg
    src/
        components/         Shared layout, status, summaries
        pages/              AdminDashboard, AdvisorDashboard, StudentDashboard, Login
        accountEmail.js     User email formatting and validation
        api.js              API requests and backend communication
        App.jsx             Role-restricted page navigation
        index.css           Responsive theme
        main.jsx            React application entry point
    vite.config.js        Vite development and build configuration
    index.html            Main HTML entry point
server/
    config/               Database and application configuration
    controllers/          Request handling and business logic
    middleware/           Authentication, authorization, and error handling
    models/               All MongoDB schemas and data structures
    routes/               API endpoints and request routing
    services/             Shared business operations and services
    utils/                Helper functions and validation utilities
    app.js                Main Express server configuration
    seed.js               Initial database setup and sample data
```

### References
Database Design - dbdiagram https://dbdiagram.io/d/Course-Registration-System-6ac363cb0f25a52d018de34f
Universit Logo Design - https://canva.link/68qyodrot9muu08