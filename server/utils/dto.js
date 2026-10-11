const {
  finalisedTerms
} = require("../config/term");
function id(value) {
  if (value == null) return value;
  return String(value._id || value);
}

// Remove private details from user responses
function userSafe(user) {
  if (!user) return null;
  const out = {
    _id: id(user),
    name: user.name,
    email: user.email,
    role: user.role,
    active: Boolean(user.active)
  };

  if (user.studentId) out.studentId = user.studentId;
  if (user.advisorId) out.advisorId = id(user.advisorId);

  return out;
}

function courseDTO(course) {
  return {
    _id: id(course),
    code: course.code,
    title: course.title,
    credits: course.credits,
    description: course.description || ""
  };
}

// Check whether course add/drop is currently open
function addDropIsOpen(offering) {
  return Boolean(
    offering.addDropOpen && offering.addDropClosesAt &&
      new Date(offering.addDropClosesAt).getTime() > Date.now() &&
      !finalisedTerms.includes(offering.term)
  );
}

// Format course section data for API responses
function offeringDTO(offering) {
  const course = offering.courseId && offering.courseId.code ? offering.courseId : null;
  const seatsTaken = Number(offering.seatsTaken || 0);
  const seats = Number(offering.seats || 0);

  return {
    _id: id(offering),
    courseId: id(course || offering.courseId),
    courseCode: course ? course.code : undefined,
    title: course ? course.title : undefined,
    credits: course ? course.credits : undefined,
    term: offering.term,
    section: offering.section,
    day: offering.day,
    startTime: offering.startTime,
    endTime: offering.endTime,
    room: offering.room,
    instructor: offering.instructor,
    instructorEmail: offering.instructorEmail || "",
    seats,
    seatsTaken,
    seatsRemaining: Math.max(0, seats - seatsTaken),
    addDropOpen: Boolean(offering.addDropOpen),
    addDropClosesAt: offering.addDropClosesAt ? new Date(offering.addDropClosesAt).toISOString() : null,
    addDropIsOpen: addDropIsOpen(offering)
  };
}

function registrationDTO(registration) {
  return {
    _id: id(registration),
    studentId: id(registration.studentId),
    offeringId: id(registration.offeringId),
    term: registration.term,
    status: registration.status,
    offering: offeringDTO(registration.offeringId)
  };
}

module.exports = {
  id,
  userSafe,
  courseDTO,
  offeringDTO,
  registrationDTO,
  addDropIsOpen
};