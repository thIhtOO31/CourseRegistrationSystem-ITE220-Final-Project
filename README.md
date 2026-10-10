# Final Project

**Project:** Course Registration System<br>
**Course:** ITE220 - Web Development II<br> 
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
npm install --prefix server
npm install --prefix client
```

Copy `server/.env.example` to `server/.env`. Fill in your own `MONGO_URI`, `JWT_SECRET`, `PORT` and `CLIENT_URL` values. **Never commit or share your `.env`.**

```env
MONGO_URI=mongodb+srv://<Username>:<Password>.s1ww01y.mongodb.net/?appName=M0
JWT_SECRET=8080@abc
PORT=3000
CLIENT_URL=http://localhost:5173
```

**Seed only a NEW/EMPTY development database:**

```bash
npm run seed --prefix server
```

The seed refuses to run if any of the five project collections contains data, or if the local credentials file already exists. It does not delete records or automatically reset anything. It creates 1 admin, 4 advisors and 25 named students, their history, current registrations and 12 course sections. Fixed academic edge cases (retakes, full seats, time clashes) remain available.

### Development login credentials

After **successful seeding**, open the local file:

`server/.seed-credentials.csv`

It contains each seeded account's **role, name, unique email, student ID and unique randomly generated initial password**. It is created with restricted filesystem permissions where supported, never returned by the API, never embedded in the frontend and excluded by `.gitignore`. Each account's password is bcrypt-hashed in MongoDB. Do not publish, email publicly, or commit the CSV; safeguard it as a development secret. If you lose the file, reset passwords using a controlled process; do not rerun the seed on a populated database.

Wakanda University - Course Registration System and its email domain are fictional. The seed creates an account named **Admin** (`admin@admin.wakanda.forever`), four advisors with addresses such as `satoru.gojo@advisor.wakanda.forever`, and 25 students with addresses such as `st2026001@student.wakanda.forever`. Names are anime characters used for sample data only. Course codes and names are illustrative, not official university curriculum information.

In separate terminals:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

Open `http://localhost:5173` in a browser.

### References
Database Design - dbdiagram https://dbdiagram.io/d/Course-Registration-System-6ac363cb0f25a52d018de34f
Universit Logo Design - https://canva.link/68qyodrot9muu08