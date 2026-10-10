const User = require("../models/User");
const Course = require("../models/Course");
const Offering = require("../models/Offering");
const Registration = require("../models/Registration");
const Record = require("../models/Record");

const {finalisedTerms} = require("../config/term");
const {AppError} = require("../middleware/error");

const {
  assertObjectId,
  assertTerm,
  toMinutes
} = require("../utils/validation");

const {
  userSafe,
  offeringDTO,
  id
} = require("../utils/dto");

const PASSING = new Set(["A", "B+", "B", "C+", "C", "D+", "D"]);

function withSession(query, session) {
  return session ? query.session(session) : query;
}

// Check whether two course times overlap
function overlaps(a, b) {
  return a.day === b.day && toMinutes(a.startTime) < toMinutes(b.endTime) &&
    toMinutes(b.startTime) < toMinutes(a.endTime);
}

function label(offering) {
  const course = offering.courseId;
  return `${course.code} Section ${offering.section}`;
}

// Check which course offerings a student can take
async function getEligibility({
  studentId,
  term,
  selectedOfferingIds = [],
  session = null
}) {
  assertObjectId(studentId, "student ID");
  assertTerm(term);

  if (!Array.isArray(selectedOfferingIds)) {
    throw new AppError(400, "selectedOfferingIds must be an array");
  }

  const selectedIds = selectedOfferingIds.map(String).filter(Boolean);

  selectedIds.forEach(value => assertObjectId(value, "selected offering ID"));

  if (new Set(selectedIds).size !== selectedIds.length) {
    throw new AppError(400, "Duplicate selected offering IDs are not allowed");
  }

  const student = await withSession(User.findById(studentId), session);

  if (!student || student.role !== "student" || !student.active) {
    throw new AppError(404, "Active student not found");
  }

  // Keep session-backed operations sequential. MongoDB transactions should not run parallel queries
  const courses = await withSession(Course.find().sort({
    code: 1
  }), session);

  const records = await withSession(Record.find({
    studentId
  }).populate("courseId"), session);

  const offerings = await withSession(Offering.find({
    term
  }).populate("courseId").sort({
    section: 1
  }), session);

  const activeRegistrations = await withSession(
    Registration.find({
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
    ),
    session
  );

  const offeringMap = new Map(offerings.map(offering => [id(offering), offering]));

  for (const selectedId of selectedIds) {
    if (!offeringMap.has(selectedId)) {
      const exists = await withSession(Offering.findById(selectedId).select("term"), session);
      if (!exists) throw new AppError(400, "A selected offering does not exist");
      throw new AppError(400, "A selected offering belongs to another term");
    }
  }

  const passByCourse = new Map();
  const failedCourses = new Set();

  for (const record of records) {
    const courseId = id(record.courseId);
    if (PASSING.has(record.grade)) {
      passByCourse.set(courseId, record.grade);
    } else if (record.grade === "F") {
      failedCourses.add(courseId);
    }
  }

  const unresolvedFailure = courseId => failedCourses.has(String(courseId)) && !passByCourse.has(String(courseId));
  const selectedOfferings = selectedIds.map(selectedId => offeringMap.get(selectedId));
  const activeOfferings = activeRegistrations.map(registration => registration.offeringId).filter(Boolean);
  const registeredCourseIds = new Set(activeOfferings.map(offering => id(offering.courseId)));
  const extraReasons = new Map();
  function addExtra(offeringId, reason) {
    const key = String(offeringId);
    if (!extraReasons.has(key)) extraReasons.set(key, []);
    if (!extraReasons.get(key).includes(reason)) extraReasons.get(key).push(reason);
  }

  for (let i = 0; i < selectedOfferings.length; i += 1) {
    for (let j = i + 1; j < selectedOfferings.length; j += 1) {
      const a = selectedOfferings[i];
      const b = selectedOfferings[j];
      if (id(a.courseId) === id(b.courseId)) {
        addExtra(id(a), `Another section of ${a.courseId.code} is selected`);
        addExtra(id(b), `Another section of ${b.courseId.code} is selected`);
      }
      if (overlaps(a, b)) {
        addExtra(id(a), `Clashes with ${label(b)}`);
        addExtra(id(b), `Clashes with ${label(a)}`);
      }
    }
  }

  const sections = offerings.map(
    offering => {
      const base = offeringDTO(offering);
      const courseId = id(offering.courseId);
      const reasons = [];
      const passingGrade = passByCourse.get(courseId);

      if (passingGrade) reasons.push(`Already passed - grade ${passingGrade}`);
      if (registeredCourseIds.has(courseId)) reasons.push("Already registered");
      if (base.seatsRemaining <= 0) reasons.push("Full - 0 seats");

      for (const existing of activeOfferings) {
        if (id(existing) !== id(offering) && overlaps(offering, existing)) {
          reasons.push(`Clashes with ${label(existing)}`);
        }
      }

      for (const selected of selectedOfferings) {
        if (id(selected) === id(offering)) continue;
        if (id(selected.courseId) === courseId) {
          reasons.push(`Another section of ${offering.courseId.code} is selected`);
        }
        if (overlaps(offering, selected)) {
          reasons.push(`Clashes with ${label(selected)}`);
        }
      }

      for (const reason of extraReasons.get(id(offering)) || []) reasons.push(reason);
      const uniqueReasons = [...new Set(reasons)];
      return {
        ...base,
        selectable: uniqueReasons.length === 0,
        retakeRequired: unresolvedFailure(courseId),
        reasons: uniqueReasons
      };
    }
  );

  sections.sort(
    (a, b) => {
      if (a.retakeRequired !== b.retakeRequired) return a.retakeRequired ? -1 : 1;
      const codeOrder = String(a.courseCode).localeCompare(String(b.courseCode));
      return codeOrder || a.section - b.section;
    }
  );

  const offeredCourseIds = new Set(offerings.map(offering => id(offering.courseId)));

  const unavailableCourses = courses.filter(course => !offeredCourseIds.has(id(course))).map(
    course => ({
      courseId: id(course),
      courseCode: course.code,
      title: course.title,
      retakeRequired: unresolvedFailure(id(course)),
      reason: "Not offered this term"
    })
  ).sort(
    (a, b) => {
      if (a.retakeRequired !== b.retakeRequired) return a.retakeRequired ? -1 : 1;
      return a.courseCode.localeCompare(b.courseCode);
    }
  );

  return {
    student: userSafe(student),
    term,
    termFinalised: finalisedTerms.includes(term),
    sections,
    unavailableCourses
  };
}

module.exports = {getEligibility,PASSING};