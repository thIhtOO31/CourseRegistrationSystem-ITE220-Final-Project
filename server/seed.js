const path = require("path");

require("dotenv").config({path: path.join(__dirname, ".env")});

const fs = require("fs");
const {randomBytes} = require("crypto");

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const User = require("./models/User");
const Course = require("./models/Course");
const Offering = require("./models/Offering");
const Registration = require("./models/Registration");
const Record = require("./models/Record");

const {currentTerm} = require("./config/term");
const {accountEmail} = require("./utils/accountEmail");

// Fictional catalogue and people, not verified university curriculum data
const CREDENTIALS_FILE = path.join(__dirname, ".seed-credentials.csv");
const courseData = [
  {
    code: "CSC220",
    title: "Web Development II",
    credits: 3,
    description: "Server-side and full-stack web development."
  },
  {
    code: "ITE110",
    title: "Programming Fundamentals",
    credits: 3,
    description: "Variables, selection, loops, and problem solving."
  },
  {
    code: "CSC210",
    title: "Object-Oriented Programming",
    credits: 3,
    description: "Classes, objects, inheritance, and encapsulation."
  },
  {
    code: "ITE230",
    title: "Database Systems",
    credits: 3,
    description: "Relational database design and SQL."
  },
  {
    code: "ITE250",
    title: "Computer Networks",
    credits: 3,
    description: "Network fundamentals, IP addressing, and routing."
  },
  {
    code: "ITE321",
    title: "Systems Analysis and Design",
    credits: 3,
    description: "Requirements, use cases, and system modelling."
  },
  {
    code: "CSC230",
    title: "Data Structures",
    credits: 3,
    description: "Lists, stacks, queues, trees, and algorithms."
  },
  {
    code: "ITE310",
    title: "Software Engineering",
    credits: 3,
    description: "Software lifecycle, testing, and teamwork."
  },
  {
    code: "ITE355",
    title: "Data Warehousing and Data Mining",
    credits: 3,
    description: "Data preparation, classification, association, and clustering."
  },
  {
    code: "ITE340",
    title: "Information Security",
    credits: 3,
    description: "Security controls, risks, and secure computing."
  }
];

const studentNames = [
  "Naruto Uzumaki",
  "Sasuke Uchiha",
  "Ichigo Kurosaki",
  "Tanjiro Kamado",
  "Izuku Midoriya",
  "Megumi Fushiguro",
  "Yuji Itadori",
  "Rukia Kuchiki",
  "Hinata Hyuga",
  "Sakura Haruno",
  "Levi Ackerman",
  "Mikasa Ackerman",
  "Eren Yeager",
  "Killua Zoldyck",
  "Gon Freecss",
  "Edward Elric",
  "Alphonse Elric",
  "Shinra Kusakabe",
  "Natsu Dragneel",
  "Lucy Heartfilia",
  "Yuta Okkotsu",
  "Nobara Kugisaki",
  "Ken Kaneki",
  "Toshiro Hitsugaya",
  "Orihime Inoue"
];

const advisorNames = ["Satoru Gojo", "Kakashi Hatake", "Shota Aizawa", "Kento Nanami"];

const instructorNames = [
  "Kento Nanami",
  "Shota Aizawa",
  "Kakashi Hatake",
  "Satoru Gojo",
  "Shota Aizawa",
  "Kisuke Urahara",
  "Kakashi Hatake",
  "Erwin Smith",
  "Rintaro Okabe",
  "Tengen Uzui"
];

// Prepare initial account details
function makeAccount(name, role, extra = {}) {
  const email = accountEmail({
    name,
    role,
    studentId: extra.studentId
  });
  return {
    name,
    email,
    role,
    active: true,
    ...extra,
    password: randomBytes(21).toString("base64url")
  };
}

// Check whether the database is ready for seed data
async function ensureEmpty() {
  const counts = await Promise.all(
    [
      User.countDocuments(),
      Course.countDocuments(),
      Offering.countDocuments(),
      Registration.countDocuments(),
      Record.countDocuments()
    ]
  );

  if (counts.some(count => count > 0))
    throw new Error("Seed refused: project collections are not empty. Use a fresh development database.");

  if (fs.existsSync(CREDENTIALS_FILE))
    throw new Error("Seed refused: local credentials file already exists. Back it up before using another fresh database.");
}

// Create the initial university accounts
async function createAccounts(accounts) {
  const hashes = await Promise.all(accounts.map(account => bcrypt.hash(account.password, 10)));
  return User.create(
    accounts.map(({
      password,
      ...account
    }, i) => ({
      ...account,
      passwordHash: hashes[i]
    }))
  );
}

// Create the starting university data
async function main() {
  await connectDB();
  await ensureEmpty();

  const adminAccounts = [makeAccount("Admin", "admin")];
  const advisorAccounts = advisorNames.map(name => makeAccount(name, "advisor"));
  const [admin] = await createAccounts(adminAccounts);
  const advisors = await createAccounts(advisorAccounts);

  const studentAccounts = studentNames.map(
    (name, i) => makeAccount(
      name,
      "student",
      {
        studentId: `ST2026${String(i + 1).padStart(3, "0")}`,
        advisorId: advisors[i % advisors.length]._id
      }
    )
  );

  const createdStudents = await createAccounts(studentAccounts);
  const courses = await Course.create(courseData);
  const byCode = Object.fromEntries(courses.map(course => [course.code, course]));

  const offeringData = [
    ["CSC220", 1, "Mon", "09:00", "11:00", "R401", 0, 5],
    ["CSC220", 2, "Wed", "13:00", "15:00", "R402", 1, 5],
    ["ITE110", 1, "Mon", "10:00", "12:00", "R301", 2, 5],
    ["CSC210", 1, "Mon", "11:00", "13:00", "R302", 3, 5],
    ["ITE230", 1, "Tue", "09:00", "11:00", "R303", 4, 5],
    ["ITE250", 1, "Wed", "09:00", "11:00", "R304", 5, 5],
    ["ITE250", 2, "Wed", "11:00", "13:00", "R305", 5, 5],
    ["ITE321", 1, "Mon", "10:00", "12:00", "R306", 6, 5],
    ["CSC230", 1, "Thu", "13:00", "15:00", "R307", 7, 1],
    ["ITE310", 1, "Fri", "09:00", "11:00", "R308", 8, 2],
    ["ITE310", 2, "Mon", "11:00", "13:00", "R309", 8, 5],
    ["ITE355", 1, "Wed", "10:00", "12:00", "R310", 9, 5]
  ].map(
    ([code, section, day, startTime, endTime, room, instructorIndex, seats]) => ({
      courseId: byCode[code]._id,
      term: currentTerm,
      section,
      day,
      startTime,
      endTime,
      room,
      instructor: instructorNames[instructorIndex],
      instructorEmail: accountEmail({
        name: instructorNames[instructorIndex],
        role: "advisor"
      }),
      seats,
      seatsTaken: 0,
      addDropOpen: false,
      addDropClosesAt: null
    })
  );

  const offerings = await Offering.create(offeringData);

  const offeringByKey = {};
  for (const offering of offerings) {
    const course = courses.find(item => String(item._id) === String(offering.courseId));
    offeringByKey[`${course.code}-${offering.section}`] = offering;
  }

  const grades = ["A", "B+", "B", "C+", "C", "D+", "D"];
  const records = [];

  for (let i = 0; i < createdStudents.length; i += 1) {
    ["ITE110", "CSC210", "ITE230", "ITE250"].forEach(
      (code, index) => {
        records.push(
          {
            studentId: createdStudents[i]._id,
            courseId: byCode[code]._id,
            term: index < 2 ? "2025-1" : "2025-2",
            grade: grades[(i + index) % grades.length]
          }
        );
      }
    );
  }

  records.push(
    {
      studentId: createdStudents[0]._id,
      courseId: byCode.CSC220._id,
      term: "2025-3",
      grade: "F"
    }
  );

  records.push(
    {
      studentId: createdStudents[1]._id,
      courseId: byCode.ITE321._id,
      term: "2025-3",
      grade: "W"
    }
  );

  records.push(
    {
      studentId: createdStudents[2]._id,
      courseId: byCode.ITE321._id,
      term: "2025-2",
      grade: "F"
    }
  );

  records.push(
    {
      studentId: createdStudents[2]._id,
      courseId: byCode.ITE321._id,
      term: "2025-3",
      grade: "D"
    }
  );

  records.push(
    {
      studentId: createdStudents[5]._id,
      courseId: byCode.CSC230._id,
      term: "2025-3",
      grade: "F"
    }
  );

  records.push(
    {
      studentId: createdStudents[6]._id,
      courseId: byCode.ITE340._id,
      term: "2025-3",
      grade: "F"
    }
  );

  records.push(
    {
      studentId: createdStudents[7]._id,
      courseId: byCode.CSC220._id,
      term: "2025-2",
      grade: "F"
    }
  );

  records.push(
    {
      studentId: createdStudents[7]._id,
      courseId: byCode.CSC220._id,
      term: "2025-3",
      grade: "B+"
    }
  );

  await Record.create(records);

  await Registration.create(
    [
      {
        studentId: createdStudents[24]._id,
        offeringId: offeringByKey["CSC230-1"]._id,
        term: currentTerm,
        status: "registered"
      },
      {
        studentId: createdStudents[23]._id,
        offeringId: offeringByKey["ITE310-1"]._id,
        term: currentTerm,
        status: "registered"
      },
      {
        studentId: createdStudents[4]._id,
        offeringId: offeringByKey["ITE250-1"]._id,
        term: currentTerm,
        status: "registered"
      }
    ]
  );

  for (const offering of offerings) {
    offering.seatsTaken = await Registration.countDocuments({
      offeringId: offering._id,
      status: "registered"
    });
    await offering.save();
  }

  // This file is intentionally the ONLY place plaintext development passwords are written
  // Creation with wx prevents silently overwriting previously generated credentials
  const rows = [
    "role,name,email,studentId,password",
    ...[...adminAccounts, ...advisorAccounts, ...studentAccounts].map(
      a => [a.role, a.name, a.email, a.studentId || "", a.password].join(",")
    )
  ];

  fs.writeFileSync(CREDENTIALS_FILE, `${rows.join("\n")}\n`, {
    mode: 0o600,
    flag: "wx"
  });

  console.log(`${createdStudents.length} students, ${advisors.length} advisors, 1 admin created`);
  console.log(
    `${courses.length} courses, ${offerings.length} sections, ${records.length} academic records for ${currentTerm}`
  );
  console.log("Development login credentials saved privately to server/.seed-credentials.csv");
  console.log(`Admin ID: ${admin._id}`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(
  async () => {
    await mongoose.disconnect();
  }
);