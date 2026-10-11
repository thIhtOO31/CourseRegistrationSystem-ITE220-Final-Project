const User = require("../models/User");
const Record = require("../models/Record");
const Registration = require("../models/Registration");

const { finalisedTerms } = require("../config/term");
const { AppError, asyncHandler } = require("../middleware/error");
const { assertObjectId, assertTerm } = require("../utils/validation");
const { userSafe, registrationDTO, id } = require("../utils/dto");
const { getEligibility, PASSING } = require("../services/eligibilityService");

// Find a student account
async function getStudent(studentId) {
  assertObjectId(studentId, "student ID");

  const student = await User.findOne({
    _id: studentId,
    role: "student",
    active: true
  }).populate(
    "advisorId",
    "name email active role"
  );

  if (!student) throw new AppError(404, "Active student not found");
  return student;
}

// Check permission to view student records
function ensureRecordAccess(req, studentId) {
  if (req.user.role === "student" && String(req.user._id) !== String(studentId)) {
    throw new AppError(403, "You can only view your own academic record");
  }
}

// Prepare the student academic history
async function buildHistory(studentId) {
  const student = await getStudent(studentId);
  const records = await Record.find({
    studentId
  }).populate("courseId").sort({
    term: 1,
    _id: 1
  });

  const passed = new Set();
  const failed = new Set();

  for (const record of records) {
    const courseId = id(record.courseId);
    if (PASSING.has(record.grade)) passed.add(courseId);
    if (record.grade === "F") failed.add(courseId);
  }

  let totalCreditsEarned = 0;

  const counted = new Set();
  for (const record of records) {
    const courseId = id(record.courseId);
    if (PASSING.has(record.grade) && !counted.has(courseId)) {
      totalCreditsEarned += record.courseId.credits;
      counted.add(courseId);
    }
  }

  const recordDTOs = records.map(
    record => {
      const courseId = id(record.courseId);
      return {
        _id: id(record),
        courseId,
        courseCode: record.courseId.code,
        title: record.courseId.title,
        credits: record.courseId.credits,
        term: record.term,
        grade: record.grade,
        retakeRequired: failed.has(courseId) && !passed.has(courseId)
      };
    }
  );

  const advisor = student.advisorId && student.advisorId.active && student.advisorId.role === "advisor"
    ? {
      name: student.advisorId.name,
      email: student.advisorId.email
    }
    : null;

  return {
    student: userSafe(student),
    advisor,
    records: recordDTOs,
    totalCreditsEarned
  };
}

// Prepare the current registrations
async function buildRegistrations(studentId, term) {
  await getStudent(studentId);
  assertTerm(term);
  const registrations = await Registration.find({
    studentId,
    term,
    status: "registered"
  }).populate(
    {
      path: "offeringId",
      populate: {
        path: "courseId"
      }
    }
  ).sort(
    {
      createdAt: 1
    }
  );
  return {
    term,
    termFinalised: finalisedTerms.includes(term),
    registrations: registrations.map(registrationDTO)
  };
}

// Return students assigned to an advisor
const listStudents = asyncHandler(
  async (req, res) => {
    const students = await User.find({
      role: "student",
      active: true
    }).sort({
      name: 1
    });
    res.json({
      data: students.map(userSafe)
    });
  }
);

const getStudentRecord = asyncHandler(
  async (req, res) => {
    ensureRecordAccess(req, req.params.id);
    const data = await buildHistory(req.params.id);
    res.json({
      data
    });
  }
);

// Check which courses a student can take
const getEligible = asyncHandler(
  async (req, res) => {
    const selected = typeof req.query.selectedOfferingIds === "string" && req.query.selectedOfferingIds.trim()
      ? req.query.selectedOfferingIds.split(",").map(value => value.trim()).filter(Boolean)
      : [];
    const data = await getEligibility({
      studentId: req.params.id,
      term: req.query.term,
      selectedOfferingIds: selected
    });
    res.json({
      data
    });
  }
);

const getStudentRegistrations = asyncHandler(
  async (req, res) => {
    assertObjectId(req.params.id, "student ID");
    const data = await buildRegistrations(req.params.id, req.query.term);
    res.json({
      data
    });
  }
);

// Return the signed-in student registrations
const getMyRegistrations = asyncHandler(
  async (req, res) => {
    const data = await buildRegistrations(req.user._id, req.query.term);
    res.json({
      data
    });
  }
);

const getMyRecord = asyncHandler(async (req, res) => {
  const data = await buildHistory(req.user._id);
  res.json({
    data
  });
});

module.exports = {
  listStudents,
  getStudentRecord,
  getEligible,
  getStudentRegistrations,
  getMyRegistrations,
  getMyRecord,
  buildHistory
};